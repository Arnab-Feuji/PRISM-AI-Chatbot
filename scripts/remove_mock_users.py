#!/usr/bin/env python3
"""Remove demo/mock patient accounts from PostgreSQL. Keeps portal demo + real registrations.

Run: python scripts/remove_mock_users.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, delete
from backend.database.models import (
    AsyncSession,
    User,
    Conversation,
    Message,
    PatientFeedback,
    ImageUpload,
    VideoGeneration,
    RAGASMetric,
)

# Always keep these seeded / legitimate portal accounts
KEEP_EMAILS = {
    "admin@prism.ai",
    "patient@prism.ai",
    "demo@prism.ai",
}

# Fictional demo patients injected for UI previews.
MOCK_EMAILS = {
    "s.connor@cyberdyne.org",
    "t.stark@starkindustries.com",
    "b.wayne@waynecorp.com",
    "c.kent@dailyplanet.com",
    "p.parker@dailybugle.net",
    "diana.prince@louvre.fr",
    "b.allen@ccpd.gov",
    "h.jordan@ferrisair.com",
    "a.curry@atlantis.gov",
}

MOCK_DOMAINS = (
    "cyberdyne.org",
    "starkindustries.com",
    "waynecorp.com",
    "dailyplanet.com",
    "dailybugle.net",
    "louvre.fr",
    "ccpd.gov",
    "ferrisair.com",
    "atlantis.gov",
)


def is_mock_user(email: str, name: str = "") -> bool:
    e = (email or "").strip().lower()
    n = (name or "").strip().lower()
    if not e or e in KEEP_EMAILS:
        return False
    if n in {"test user", "test browser user"}:
        return True
    if e.startswith("test_") and e.endswith("@prism.ai"):
        return True
    if e.startswith("test@") or e.startswith("test_") or e.startswith("test."):
        return True
    if e.endswith("@example.com"):
        return True
    if e in MOCK_EMAILS:
        return True
    domain = e.split("@")[-1] if "@" in e else ""
    return domain in MOCK_DOMAINS


async def remove_mock_users():
    async with AsyncSession() as session:
        res = await session.execute(select(User).where(User.role == "patient"))
        patients = res.scalars().all()

        to_delete = [u for u in patients if is_mock_user(u.email, u.name)]
        if not to_delete:
            print("[OK] No mock patient accounts found in database.")
            return

        for user in to_delete:
            uid = user.id
            print(f"[DELETE] {user.name} <{user.email}>")

            conv_res = await session.execute(
                select(Conversation.id).where(Conversation.user_id == uid)
            )
            conv_ids = [r[0] for r in conv_res.all()]

            if conv_ids:
                await session.execute(
                    delete(RAGASMetric).where(RAGASMetric.conversation_id.in_(conv_ids))
                )
                await session.execute(
                    delete(Message).where(Message.conversation_id.in_(conv_ids))
                )
                await session.execute(
                    delete(ImageUpload).where(ImageUpload.conversation_id.in_(conv_ids))
                )
                await session.execute(
                    delete(VideoGeneration).where(VideoGeneration.conversation_id.in_(conv_ids))
                )
                await session.execute(
                    delete(Conversation).where(Conversation.id.in_(conv_ids))
                )

            await session.execute(delete(PatientFeedback).where(PatientFeedback.user_id == uid))
            await session.execute(delete(ImageUpload).where(ImageUpload.user_id == uid))
            await session.execute(delete(VideoGeneration).where(VideoGeneration.user_id == uid))
            await session.execute(delete(User).where(User.id == uid))

        await session.commit()
        print(f"[SUCCESS] Removed {len(to_delete)} mock patient account(s).")

        kept = [u for u in patients if not is_mock_user(u.email, u.name)]
        print(f"[INFO] {len(kept)} patient account(s) retained:")
        for u in kept:
            print(f"         - {u.name} <{u.email}>")


if __name__ == "__main__":
    asyncio.run(remove_mock_users())
