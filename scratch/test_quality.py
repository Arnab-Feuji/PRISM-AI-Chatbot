import asyncio
from datetime import datetime, timedelta
from backend.database.models import AsyncSession, text
from backend.core.quality.quality_metrics import compute_quality_for_patient

async def test():
    async with AsyncSession() as db:
        # Get a user who has conversations
        res = await db.execute(text("SELECT DISTINCT user_id FROM conversations LIMIT 1"))
        user_id = res.scalar()
        if not user_id:
            print("No users with conversations found.")
            return
        
        print(f"Testing quality computation for user: {user_id}")
        report = await compute_quality_for_patient(user_id, db)
        
        if "error" in report:
            print(f"Report failed: {report['error']}")
        else:
            print("Quality Computation Successful!")
            print(f"CQS: {report.get('cqs')}")
            print(f"Dimensions: {list(report.get('dimensions', {}).keys())}")
            for dim, data in report.get('dimensions', {}).items():
                print(f"  - {dim}: {data.get('score')}")

if __name__ == "__main__":
    asyncio.run(test())
