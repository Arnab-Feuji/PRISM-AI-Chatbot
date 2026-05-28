import asyncio
from sqlalchemy import select
from backend.database.models import User, AsyncSession

async def check_null_diseases():
    async with AsyncSession() as db:
        res = await db.execute(select(User).where(User.subscribed_diseases == None))
        users = res.scalars().all()
        print(f"Found {len(users)} users with NULL subscribed_diseases")
        for u in users:
            print(f"User: {u.email}")

if __name__ == "__main__":
    asyncio.run(check_null_diseases())
