import asyncio
from backend.database.models import AsyncSession, Conversation, User, Message
from sqlalchemy import select, func
from datetime import datetime, timedelta

async def check():
    async with AsyncSession() as db:
        u_res = await db.execute(select(Conversation.user_id).limit(1))
        user_id = u_res.scalar()
        
        from backend.core.quality.quality_metrics import compute_quality_for_patient
        report = await compute_quality_for_patient(user_id, db)
        
        with open("error_report.txt", "w") as f:
            if "error" in report:
                f.write(f"ERROR: {report['error']}")
            else:
                f.write("SUCCESS")

if __name__ == "__main__":
    asyncio.run(check())
