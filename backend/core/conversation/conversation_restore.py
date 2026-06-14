"""Restore escalation and appointment context when revisiting a conversation."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.agents.smart_router import HUMAN_AGENTS, SPECIALIST_AGENTS
from backend.config.agent_registry import ALL_AGENTS
from backend.database.models import Conversation, DoctorAppointmentBooking, DoctorDetail, Message


def _parse_meta(conv: Conversation) -> dict:
    meta = getattr(conv, "meta_json", None) or {}
    if isinstance(meta, str):
        try:
            meta = json.loads(meta)
        except Exception:
            meta = {}
    return meta if isinstance(meta, dict) else {}


def _format_slot_label(start: datetime, end: datetime) -> str:
    return f"{start.strftime('%I:%M %p').lstrip('0')} – {end.strftime('%I:%M %p').lstrip('0')}"


def resolve_escalation_state(conv: Conversation, messages: list[Message] | None = None) -> dict[str, Any] | None:
    """Return persisted or inferred escalation state for a conversation."""
    meta = _parse_meta(conv)
    saved = meta.get("escalation_state")
    if saved and saved.get("route_decision") in ("specialist", "human"):
        return saved

    agent_id = (conv.agent_id or "").upper()
    if not agent_id:
        return None

    route = "primary"
    if getattr(conv, "escalated", False) and messages:
        for msg in reversed(messages):
            if msg.role != "assistant":
                continue
            aid = (msg.agent_id or "").upper()
            if aid.endswith("-H"):
                route = "human"
                break
            if aid.endswith("-S"):
                route = "specialist"
                break

    if route == "primary":
        return None

    specialist_info = SPECIALIST_AGENTS.get(agent_id, {})
    human_info = HUMAN_AGENTS.get(agent_id, {})
    last_confidence = None
    last_frustration = None
    if messages:
        for msg in reversed(messages):
            if msg.role == "assistant":
                last_confidence = getattr(msg, "confidence", None)
                last_frustration = getattr(msg, "frustration", None)
                break

    return {
        "route_decision": route,
        "escalation_active": True,
        "confidence": last_confidence,
        "frustration_score": last_frustration or 0,
        "specialist_agent": {
            "agent_id": f"{agent_id}-S",
            "name": specialist_info.get("name", ""),
            "activated": route == "specialist",
        },
        "human_agent": {
            "agent_id": f"{agent_id}-H",
            "name": human_info.get("name", ""),
            "role": human_info.get("role", ""),
            "contact": human_info.get("contact", ""),
            "activated": route == "human",
        },
        "escalation_monitor": {
            "frustration_score": last_frustration or 0,
            "triggers": [],
            "trigger_codes": [],
            "confidence": last_confidence or 0,
            "route": route,
            "active": True,
        },
    }


async def get_user_booking_for_agent(
    db: AsyncSession,
    *,
    user_id: str,
    agent_id: str,
) -> dict[str, Any] | None:
    """Return the user's booking for this agent, preferring the next upcoming slot."""
    agent_id = (agent_id or "").upper()
    if not agent_id or agent_id not in ALL_AGENTS:
        return None

    now = datetime.now()
    res = await db.execute(
        select(DoctorAppointmentBooking, DoctorDetail)
        .join(DoctorDetail, DoctorAppointmentBooking.doctor_detail_id == DoctorDetail.id)
        .where(
            DoctorAppointmentBooking.user_id == user_id,
            or_(
                DoctorAppointmentBooking.agent_id == agent_id,
                DoctorDetail.therapeutic_area == ALL_AGENTS[agent_id].agent_name,
            ),
        )
        .order_by(DoctorAppointmentBooking.slot_start.desc())
    )
    rows = res.all()
    if not rows:
        return None

    booking, doctor = rows[0]
    for candidate_booking, candidate_doctor in rows:
        if candidate_booking.slot_start >= now:
            booking, doctor = candidate_booking, candidate_doctor
            break

    return {
        "booking_id": booking.id,
        "doctor_id": doctor.id,
        "doctor_name": doctor.doctor_name,
        "disease_name": doctor.disease_name,
        "therapeutic_area": doctor.therapeutic_area,
        "slot_start": booking.slot_start.isoformat(),
        "slot_end": booking.slot_end.isoformat(),
        "label": _format_slot_label(booking.slot_start, booking.slot_end),
        "day_label": booking.slot_start.strftime("%a, %b %d"),
        "conversation_id": booking.conversation_id,
    }


async def build_restore_context(
    db: AsyncSession,
    *,
    conv: Conversation,
    messages: list[Message],
    user_id: str,
) -> dict[str, Any]:
    escalation_state = resolve_escalation_state(conv, messages)
    my_booking = await get_user_booking_for_agent(db, user_id=user_id, agent_id=conv.agent_id or "")
    return {
        "escalation_state": escalation_state,
        "my_booking": my_booking,
    }
