import asyncio
from sqlalchemy import select
from backend.database.models import User, AsyncSession
import json

async def check_enum_type():
    async with AsyncSession() as db:
        res = await db.execute(select(User).limit(1))
        user = res.scalar_one_or_none()
        if user:
            print(f"Role: {user.role}, Type: {type(user.role)}")
            print(f"Subscription: {user.subscription}, Type: {type(user.subscription)}")
            try:
                json.dumps({"role": user.role})
                print("JSON serializable")
            except Exception as e:
                print(f"Not JSON serializable: {e}")

if __name__ == "__main__":
    asyncio.run(check_enum_type())
