
import asyncio
import os
import sys

# Add the project root to sys.path
sys.path.append(os.getcwd())

from backend.database.models import AsyncSession, PatientFeedback
from sqlalchemy import select

async def check_feedback():
    async with AsyncSession() as session:
        res = await session.execute(select(PatientFeedback))
        fbs = res.scalars().all()
        print(f"Total feedbacks: {len(fbs)}")
        for f in fbs:
            print(f"ID: {f.id}, Rating: {f.rating}, Comment: {repr(f.comment)}, Tags: {f.tags}")

if __name__ == "__main__":
    asyncio.run(check_feedback())
