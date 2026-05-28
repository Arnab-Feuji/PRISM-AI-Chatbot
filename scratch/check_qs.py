
import asyncio
from backend.database.models import AsyncSession, AgentQuestion
from sqlalchemy import select

async def check_questions():
    async with AsyncSession() as session:
        res = await session.execute(select(AgentQuestion))
        qs = res.scalars().all()
        print(f"Total questions: {len(qs)}")
        active = [q for q in qs if q.is_active]
        print(f"Active questions: {len(active)}")
        for q in active[:10]:
            print(f"  [{q.agent_id}] {q.text} (Misses: {q.consecutive_misses})")

if __name__ == "__main__":
    import os
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(check_questions())
