import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from backend.database.models import AsyncSession, RAGASMetric
from sqlalchemy import delete

async def purge_metrics():
    print("Purging RAGAS metrics from database...")
    async with AsyncSession() as session:
        try:
            # Delete all records from RAGASMetric table
            stmt = delete(RAGASMetric)
            result = await session.execute(stmt)
            await session.commit()
            print(f"Successfully deleted {result.rowcount} metric records.")
            print("Dashboard will now only show new evaluations.")
        except Exception as e:
            await session.rollback()
            print(f"Error purging metrics: {e}")

if __name__ == "__main__":
    asyncio.run(purge_metrics())
