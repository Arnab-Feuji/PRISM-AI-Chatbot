import asyncio
from backend.database.models import AsyncSession, Conversation, User, Message
from sqlalchemy import select, func
from datetime import datetime, timedelta

async def check():
    async with AsyncSession() as db:
        c_count = await db.execute(select(func.count(Conversation.id)))
        print(f"Total Conversations: {c_count.scalar()}")
        
        cutoff = datetime.utcnow() - timedelta(days=15)
        c_recent = await db.execute(select(func.count(Conversation.id)).where(Conversation.updated_at >= cutoff))
        print(f"Recent Conversations (15d): {c_recent.scalar()}")
        
        u_res = await db.execute(select(Conversation.user_id).limit(1))
        user_id = u_res.scalar()
        print(f"Testing quality for user: {user_id}")
        
        from backend.core.quality.quality_metrics import compute_quality_for_patient
        report = await compute_quality_for_patient(user_id, db)
        import json
        if "error" in report:
            print(f"REPORT ERROR for {user_id}: {report['error']}")
        else:
            print("Quality Report Result:")
            print(json.dumps(report, indent=2))

if __name__ == "__main__":
    asyncio.run(check())
