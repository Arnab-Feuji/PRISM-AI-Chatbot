import asyncio
from sqlalchemy import select
from backend.database.models import User, AsyncSession

async def check_users():
    async with AsyncSession() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        print(f"Found {len(users)} users")
        for u in users:
            print(f"User: {u.email}, Sub: {u.subscription}, Diseases: {u.subscribed_diseases}")

if __name__ == "__main__":
    asyncio.run(check_users())
