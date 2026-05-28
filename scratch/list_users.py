import asyncio
import sys
import os

sys.path.append(os.getcwd())

from backend.database.models import AsyncSession, User
from sqlalchemy import select

async def main():
    async with AsyncSession() as session:
        res = await session.execute(select(User))
        users = res.scalars().all()
        print(f"Total users: {len(users)}")
        print(f"{'ID':<40} | {'Name':<20} | {'Email':<30} | {'Role':<10} | {'Diseases':<20}")
        print("-" * 130)
        for u in users:
            print(f"{u.id:<40} | {u.name:<20} | {u.email:<30} | {u.role:<10} | {u.subscribed_diseases}")

if __name__ == '__main__':
    asyncio.run(main())
