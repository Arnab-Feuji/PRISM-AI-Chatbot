"""Seed the doctor_details table with 90 rows (D1–D90)."""

import asyncio
import random
import uuid
from datetime import datetime

from sqlalchemy import delete, func, select

from backend.config.agent_registry import ALL_AGENTS, DISEASE_GROUPS
from backend.database.models import AsyncSession, DoctorDetail, create_tables

DISEASE_DISPLAY_NAMES = {
    "CA": "Cancer Care",
    "CV": "Cardiovascular",
    "DM": "Diabetes",
    "MH": "Mental Illness",
    "RS": "Respiratory",
}

TIME_SLOTS = (
    datetime(2000, 1, 1, 15, 30, 0),
    datetime(2000, 1, 1, 16, 0, 0),
    datetime(2000, 1, 1, 16, 30, 0),
)
DOCTORS_PER_AREA = 3


def _availability_for_group(rng: random.Random) -> list[str]:
    slots = ["Yes", "Yes", "No"]
    rng.shuffle(slots)
    return slots


def build_doctor_rows(rng: random.Random) -> list[DoctorDetail]:
    rows: list[DoctorDetail] = []
    doctor_num = 1

    for domain_code, group in DISEASE_GROUPS.items():
        disease_name = DISEASE_DISPLAY_NAMES[domain_code]
        for agent_id in group["agents"]:
            agent = ALL_AGENTS[agent_id]
            availability = _availability_for_group(rng)
            for idx in range(DOCTORS_PER_AREA):
                rows.append(
                    DoctorDetail(
                        id=str(uuid.uuid4()),
                        doctor_name=f"D{doctor_num}",
                        disease_name=disease_name,
                        therapeutic_area=agent.agent_name,
                        availability=availability[idx],
                        time1=TIME_SLOTS[0],
                        time2=TIME_SLOTS[1],
                        time3=TIME_SLOTS[2],
                    )
                )
                doctor_num += 1

    return rows


async def seed_doctor_details(*, force: bool = False) -> None:
    print("Starting seeding of doctor details...")
    await create_tables()

    async with AsyncSession() as session:
        count_res = await session.execute(select(func.count()).select_from(DoctorDetail))
        existing = count_res.scalar_one()

        if existing and not force:
            print(f"doctor_details already has {existing} rows. Skipping (use force=True to reseed).")
            return

        if existing and force:
            await session.execute(delete(DoctorDetail))
            print(f"Cleared {existing} existing doctor_details rows.")

        rng = random.Random(42)
        rows = build_doctor_rows(rng)
        session.add_all(rows)
        await session.commit()
        print(f"Seeded {len(rows)} doctor_details rows (D1–D{len(rows)}).")


if __name__ == "__main__":
    asyncio.run(seed_doctor_details(force=True))
