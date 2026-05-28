import asyncio
from backend.database.session import get_db, async_session_factory
from backend.database.models import User, Conversation, Message, PatientFeedback
from sqlalchemy import select

async def main():
    async with async_session_factory() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        print(f"Total Users in Database: {len(users)}")
        for u in users:
            print(f"ID: {u.id} | Name: {u.name} | Email: {u.email} | Role: {u.role}")
            
        res_convs = await db.execute(select(Conversation))
        convs = res_convs.scalars().all()
        print(f"\nTotal Conversations in Database: {len(convs)}")
        for c in convs:
            print(f"Conv ID: {c.id} | User ID: {c.user_id} | Disease Code: {c.disease_code} | Agent ID: {c.agent_id}")

if __name__ == "__main__":
    asyncio.run(main())
