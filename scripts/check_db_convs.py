
import asyncio
from backend.database.models import AsyncSession, Conversation
from sqlalchemy import select, desc

async def check_convs():
    async with AsyncSession() as session:
        res = await session.execute(select(Conversation).order_by(desc(Conversation.updated_at)).limit(10))
        convs = res.scalars().all()
        print(f"{'ID':<40} | {'Agent':<10} | {'Updated At'}")
        print("-" * 75)
        for c in convs:
            print(f"{c.id:<40} | {c.agent_id:<10} | {c.updated_at}")

if __name__ == "__main__":
    import sys, os
    sys.path.append(os.getcwd())
    asyncio.run(check_convs())
