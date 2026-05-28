
import asyncio
from datetime import datetime, timedelta
from backend.database.models import AsyncSession, Conversation, Message, User
from sqlalchemy import select, update, desc

async def test_session_resume():
    print("--- Testing Session Resume Logic ---")
    
    async with AsyncSession() as session:
        # 1. Find a test user
        res = await session.execute(select(User).limit(1))
        user = res.scalar_one_or_none()
        if not user:
            print("No user found. Please seed the database first.")
            return
            
        user_id = user.id
        print(f"Testing for User: {user.email} ({user_id})")
        
        # 2. Create a fresh conversation
        conv = Conversation(
            user_id=user_id,
            agent_id="MH1",
            disease_code="MH",
            title="Resume Test Conversation"
        )
        session.add(conv)
        await session.flush()
        
        msg = Message(
            conversation_id=conv.id,
            role="user",
            content="Hello persistent session!",
            agent_id="MH1"
        )
        session.add(msg)
        await session.commit()
        print(f"Created conversation {conv.id} for agent MH1")
        
        # 3. Check 'last_active' (Global)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        res = await session.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id, Conversation.updated_at >= thirty_days_ago)
            .order_by(desc(Conversation.updated_at))
            .limit(1)
        )
        last_conv = res.scalar_one_or_none()
        if last_conv and last_conv.id == conv.id:
            print("SUCCESS: Global last_active correctly identifies the new session.")
        else:
            print("FAILURE: Global last_active failed.")
            
        # 4. Check 'resume/MH1' (Agent specific)
        res = await session.execute(
            select(Conversation)
            .where(
                Conversation.user_id == user_id, 
                Conversation.agent_id == "MH1",
                Conversation.updated_at >= thirty_days_ago
            )
            .order_by(desc(Conversation.updated_at))
            .limit(1)
        )
        agent_conv = res.scalar_one_or_none()
        if agent_conv and agent_conv.id == conv.id:
            print("SUCCESS: Agent-specific resume correctly identifies the session.")
        else:
            print("FAILURE: Agent-specific resume failed.")
            
        # 5. Test 30-day expiration
        print("\nUpdating conversation to be 31 days old...")
        old_date = datetime.utcnow() - timedelta(days=31)
        await session.execute(
            update(Conversation).where(Conversation.id == conv.id).values(updated_at=old_date)
        )
        await session.commit()
        
        # Re-check last_active
        res = await session.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id, Conversation.updated_at >= thirty_days_ago)
            .order_by(desc(Conversation.updated_at))
            .limit(1)
        )
        expired_conv = res.scalar_one_or_none()
        if not expired_conv or expired_conv.id != conv.id:
            print("SUCCESS: 30-day expiration logic works (old session hidden).")
        else:
            print("FAILURE: 30-day expiration logic failed.")

if __name__ == "__main__":
    import os
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(test_session_resume())
