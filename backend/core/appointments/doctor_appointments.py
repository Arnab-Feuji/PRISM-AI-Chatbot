"""Doctor appointment availability and booking against doctor_details."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, time
from typing import Any

from fastapi import HTTPException
from sqlalchemy import delete, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config.agent_registry import ALL_AGENTS
from backend.database.models import Conversation, DoctorAppointmentBooking, DoctorDetail

SLOT_DURATION_MINUTES = 30
DEFAULT_DAYS_AHEAD = 7
MAX_BOOKING_DAYS_AHEAD = 30

THERAPEUTIC_AREA_TO_AGENT_ID = {
    agent.agent_name: agent_id for agent_id, agent in ALL_AGENTS.items()
}

DISEASE_NAME_ALIASES = {
    "mental health": "Mental Illness",
    "mental illness": "Mental Illness",
    "chronic respiratory": "Respiratory",
    "respiratory": "Respiratory",
    "cancer care": "Cancer Care",
    "cardiovascular": "Cardiovascular",
    "diabetes": "Diabetes",
}

SLOT_TEMPLATE_STARTS = (
    time(15, 30),
    time(16, 0),
    time(16, 30),
)


def normalize_disease_name(name: str) -> str:
    return DISEASE_NAME_ALIASES.get(name.strip().lower(), name.strip())


def resolve_agent_id(*, doctor: DoctorDetail, agent_id: str | None = None) -> str:
    if agent_id and agent_id.strip():
        return agent_id.strip().upper()
    resolved = THERAPEUTIC_AREA_TO_AGENT_ID.get(doctor.therapeutic_area)
    if resolved:
        return resolved
    raise HTTPException(400, "agent_id is required for this appointment")


async def backfill_missing_booking_agent_ids(db: AsyncSession) -> int:
    """Populate agent_id on legacy rows and dedupe to one booking per user+agent."""
    null_res = await db.execute(
        select(DoctorAppointmentBooking, DoctorDetail, Conversation)
        .join(DoctorDetail, DoctorAppointmentBooking.doctor_detail_id == DoctorDetail.id)
        .outerjoin(Conversation, DoctorAppointmentBooking.conversation_id == Conversation.id)
        .where(
            or_(
                DoctorAppointmentBooking.agent_id.is_(None),
                DoctorAppointmentBooking.agent_id == "",
            )
        )
    )
    rows = null_res.all()
    if not rows:
        return 0

    from collections import defaultdict

    groups: dict[tuple[str, str], list[DoctorAppointmentBooking]] = defaultdict(list)
    for booking, doctor, conv in rows:
        if conv and conv.agent_id:
            resolved = conv.agent_id.upper()
        else:
            resolved = THERAPEUTIC_AREA_TO_AGENT_ID.get(doctor.therapeutic_area)
        if resolved:
            groups[(booking.user_id, resolved)].append(booking)

    assigned = 0
    removed = 0
    for (user_id, agent_key), pending_bookings in groups.items():
        existing_res = await db.execute(
            select(DoctorAppointmentBooking).where(
                DoctorAppointmentBooking.user_id == user_id,
                DoctorAppointmentBooking.agent_id == agent_key,
            )
        )
        combined = existing_res.scalars().all() + pending_bookings
        combined.sort(key=lambda item: item.slot_start, reverse=True)
        keeper = combined[0]
        for duplicate in combined[1:]:
            await db.delete(duplicate)
            removed += 1
        if not keeper.agent_id:
            keeper.agent_id = agent_key
            assigned += 1
        await db.flush()

    if assigned or removed:
        await db.commit()
        print(
            f"[DB] Booking agent_id backfill: assigned={assigned}, "
            f"removed_duplicate_rows={removed}"
        )
    else:
        await db.rollback()
    return assigned


def _slot_times(doctor: DoctorDetail) -> list[tuple[int, time]]:
    return [
        (1, doctor.time1.time()),
        (2, doctor.time2.time()),
        (3, doctor.time3.time()),
    ]


def _combine_date_and_time(day: datetime, slot_time: time) -> datetime:
    return datetime.combine(day.date(), slot_time)


def _format_slot_label(start: datetime, end: datetime) -> str:
    return f"{start.strftime('%I:%M %p').lstrip('0')} – {end.strftime('%I:%M %p').lstrip('0')}"


async def get_doctor_availability(
    db: AsyncSession,
    *,
    disease_name: str,
    therapeutic_area: str,
    user_id: str,
    days: int = DEFAULT_DAYS_AHEAD,
) -> dict[str, Any]:
    disease = normalize_disease_name(disease_name)
    days = max(1, min(days, 30))
    now = datetime.now()

    res = await db.execute(
        select(DoctorDetail)
        .where(
            DoctorDetail.disease_name == disease,
            DoctorDetail.therapeutic_area == therapeutic_area,
        )
        .order_by(DoctorDetail.doctor_name)
    )
    doctors = res.scalars().all()
    if not doctors:
        return {
            "disease_name": disease,
            "therapeutic_area": therapeutic_area,
            "days": days,
            "doctors": [],
            "next_available": None,
        }

    doctor_ids = [d.id for d in doctors]
    booking_res = await db.execute(
        select(DoctorAppointmentBooking).where(
            DoctorAppointmentBooking.doctor_detail_id.in_(doctor_ids),
            DoctorAppointmentBooking.slot_start >= now,
        )
    )
    bookings = booking_res.scalars().all()
    booked_map = {
        (b.doctor_detail_id, b.slot_start.replace(microsecond=0)): b for b in bookings
    }

    doctor_payload: list[dict[str, Any]] = []
    next_available = None
    my_booking: dict[str, Any] | None = None

    for doctor in doctors:
        slots: list[dict[str, Any]] = []
        if doctor.availability.lower() != "yes":
            doctor_payload.append({
                "id": doctor.id,
                "doctor_name": doctor.doctor_name,
                "availability": doctor.availability,
                "therapeutic_area": doctor.therapeutic_area,
                "slots": [],
            })
            continue

        for day_offset in range(days):
            day = now + timedelta(days=day_offset)
            for slot_number, slot_time in _slot_times(doctor):
                slot_start = _combine_date_and_time(day, slot_time)
                if slot_start <= now:
                    continue
                slot_end = slot_start + timedelta(minutes=SLOT_DURATION_MINUTES)
                booking = booked_map.get((doctor.id, slot_start.replace(microsecond=0)))
                booked = booking is not None
                booked_by_me = booked and booking.user_id == user_id

                slot = {
                    "slot_number": slot_number,
                    "slot_start": slot_start.isoformat(),
                    "slot_end": slot_end.isoformat(),
                    "label": _format_slot_label(slot_start, slot_end),
                    "day_label": slot_start.strftime("%a, %b %d"),
                    "booked": booked,
                    "booked_by_me": booked_by_me,
                    "disabled": booked and not booked_by_me,
                }
                slots.append(slot)

                if booked_by_me and my_booking is None and booking is not None:
                    my_booking = {
                        "booking_id": booking.id,
                        "doctor_id": doctor.id,
                        "doctor_name": doctor.doctor_name,
                        "slot_start": slot_start.isoformat(),
                        "slot_end": slot_end.isoformat(),
                        "label": _format_slot_label(slot_start, slot_end),
                        "day_label": slot_start.strftime("%a, %b %d"),
                    }

                if not slot["disabled"] and next_available is None:
                    next_available = {
                        "doctor_name": doctor.doctor_name,
                        "doctor_id": doctor.id,
                        "slot_start": slot_start.isoformat(),
                        "slot_end": slot_end.isoformat(),
                        "label": f"{doctor.doctor_name} · {slot_start.strftime('%a %b %d')} · {slot['label']}",
                    }

        doctor_payload.append({
            "id": doctor.id,
            "doctor_name": doctor.doctor_name,
            "availability": doctor.availability,
            "therapeutic_area": doctor.therapeutic_area,
            "slots": slots,
        })

    return {
        "disease_name": disease,
        "therapeutic_area": therapeutic_area,
        "days": days,
        "doctors": doctor_payload,
        "next_available": next_available,
        "my_booking": my_booking,
    }


async def book_doctor_slot(
    db: AsyncSession,
    *,
    user_id: str,
    agent_id: str,
    doctor_detail_id: str,
    slot_start: datetime,
    conversation_id: str | None = None,
) -> dict[str, Any]:
    res = await db.execute(select(DoctorDetail).where(DoctorDetail.id == doctor_detail_id))
    doctor = res.scalar_one_or_none()
    if not doctor:
        raise HTTPException(404, "Doctor not found")
    if doctor.availability.lower() != "yes":
        raise HTTPException(400, "Doctor is not available for appointments")

    now = datetime.now()
    if slot_start <= now:
        raise HTTPException(400, "Cannot book a slot in the past")

    valid_slot = False
    slot_number = None
    for day_offset in range(MAX_BOOKING_DAYS_AHEAD):
        day = now + timedelta(days=day_offset)
        for num, slot_time in _slot_times(doctor):
            candidate = _combine_date_and_time(day, slot_time)
            if candidate.replace(microsecond=0) == slot_start.replace(microsecond=0):
                valid_slot = True
                slot_number = num
                break
        if valid_slot:
            break

    if not valid_slot or slot_number is None:
        raise HTTPException(400, "Invalid appointment slot for this doctor")

    resolved_agent_id = resolve_agent_id(doctor=doctor, agent_id=agent_id)

    existing = await db.execute(
        select(DoctorAppointmentBooking).where(
            DoctorAppointmentBooking.doctor_detail_id == doctor_detail_id,
            DoctorAppointmentBooking.slot_start == slot_start,
        )
    )
    existing_booking = existing.scalar_one_or_none()
    if existing_booking and existing_booking.user_id != user_id:
        raise HTTPException(409, "This slot has already been booked")

    await db.execute(
        delete(DoctorAppointmentBooking).where(
            DoctorAppointmentBooking.user_id == user_id,
            DoctorAppointmentBooking.agent_id == resolved_agent_id,
        )
    )
    legacy_res = await db.execute(
        select(DoctorAppointmentBooking.id)
        .join(DoctorDetail, DoctorAppointmentBooking.doctor_detail_id == DoctorDetail.id)
        .where(
            DoctorAppointmentBooking.user_id == user_id,
            DoctorDetail.therapeutic_area == doctor.therapeutic_area,
            or_(
                DoctorAppointmentBooking.agent_id.is_(None),
                DoctorAppointmentBooking.agent_id == "",
            ),
        )
    )
    legacy_ids = [row[0] for row in legacy_res.all()]
    if legacy_ids:
        await db.execute(
            delete(DoctorAppointmentBooking).where(DoctorAppointmentBooking.id.in_(legacy_ids))
        )

    slot_end = slot_start + timedelta(minutes=SLOT_DURATION_MINUTES)
    booking = DoctorAppointmentBooking(
        id=str(uuid.uuid4()),
        doctor_detail_id=doctor_detail_id,
        user_id=user_id,
        agent_id=resolved_agent_id,
        conversation_id=conversation_id,
        slot_start=slot_start,
        slot_end=slot_end,
        slot_number=slot_number,
    )
    db.add(booking)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        err = str(getattr(exc, "orig", exc))
        if "uq_doctor_slot_start" in err or ("doctor_detail_id" in err and "slot_start" in err):
            raise HTTPException(409, "This slot has already been booked")
        if "uq_user_agent_booking" in err:
            raise HTTPException(409, "You already have a booking for this agent")
        raise HTTPException(400, "Unable to create booking")

    return {
        "booking_id": booking.id,
        "doctor_name": doctor.doctor_name,
        "disease_name": doctor.disease_name,
        "therapeutic_area": doctor.therapeutic_area,
        "agent_id": resolved_agent_id,
        "slot_start": slot_start.isoformat(),
        "slot_end": slot_end.isoformat(),
        "label": _format_slot_label(slot_start, slot_end),
    }
