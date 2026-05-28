
import asyncio
import random
from backend.database.models import AsyncSession, AgentQuestion
from backend.core.conversation.response_engine import track_agent_question_usage, get_active_agent_questions
from sqlalchemy import select

async def test_periodical_rotation():
    agent_id = "DM1" # Diabetes Monitoring
    print(f"--- Testing Periodical (Random) Rotation for Agent: {agent_id} ---")
    
    async with AsyncSession() as session:
        # 1. Get initial questions
        initial_questions = await get_active_agent_questions(agent_id, session)
        print(f"Initial questions: {initial_questions}")
        
        # 2. Simulate sessions and see if it rotates eventually (20% chance per session)
        print("\nSimulating multiple sessions to trigger 20% random rotation...")
        rotated = False
        for i in range(20):
            # Send a message that doesn't match any question
            await track_agent_question_usage(agent_id, f"Custom message {i}", session)
            
            current_questions = await get_active_agent_questions(agent_id, session)
            if set(current_questions) != set(initial_questions):
                print(f"Session {i+1}: Questions ROTATED! (Periodical/Random check)")
                print(f"New questions: {current_questions}")
                rotated = True
                break
            else:
                print(f"Session {i+1}: No rotation yet.")
        
        if rotated:
            print("\nSUCCESS: Periodical/Random rotation verified.")
        else:
            print("\nNOTE: No rotation occurred in 20 sessions (statistically possible with 20% chance, but unlikely).")

if __name__ == "__main__":
    import os
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(test_periodical_rotation())
