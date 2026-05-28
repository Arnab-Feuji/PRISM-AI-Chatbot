import asyncio
from backend.database.models import AsyncSession, RAGASMetric
from sqlalchemy import select

async def check():
    async with AsyncSession() as s:
        res = await s.execute(select(RAGASMetric).order_by(RAGASMetric.created_at.desc()).limit(10))
        metrics = res.scalars().all()
        if not metrics:
            print("No metrics found in DB.")
            return
        for m in metrics:
            print(f"ID: {m.id}, Faithfulness: {m.faithfulness}, Created: {m.created_at}")

if __name__ == "__main__":
    asyncio.run(check())
