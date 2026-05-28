
import asyncio
import uuid
from backend.database.models import AsyncSession, AgentQuestion, Conversation
from backend.core.conversation.response_engine import track_agent_question_usage, get_active_agent_questions
from sqlalchemy import select

async def test_rotation():
    agent_id = "MH1" # Mental Health - Depression
    print(f"--- Testing Rotation for Agent: {agent_id} ---")
    
    async with AsyncSession() as session:
        # 1. Check current active questions
        questions = await get_active_agent_questions(agent_id, session)
        print(f"Initial active questions: {questions}")
        initial_q = questions[0]
        
        # 2. Simulate 5 consecutive misses (by sending a custom message)
        print("\nSimulating 5 consecutive misses...")
        for i in range(5):
            await track_agent_question_usage(agent_id, "I feel sad", session)
            print(f"Miss {i+1} tracked.")
        
        # 3. Check if rotation happened
        new_questions = await get_active_agent_questions(agent_id, session)
        print(f"\nQuestions after 5 misses: {new_questions}")
        
        if set(questions) != set(new_questions):
            print("\nSUCCESS: Questions have been rotated!")
        else:
            print("\nFAILURE: Questions did not rotate.")
            
        # 4. Test selection (should reset misses)
        print(f"\nSelecting question: {new_questions[0]}")
        await track_agent_question_usage(agent_id, new_questions[0], session)
        
        res = await session.execute(
            select(AgentQuestion)
            .where(AgentQuestion.agent_id == agent_id, AgentQuestion.text == new_questions[0])
        )
        q_obj = res.scalar_one()
        print(f"Question misses after selection: {q_obj.consecutive_misses} (Expected: 0)")
        print(f"Question selection count: {q_obj.selection_count}")

if __name__ == "__main__":
    asyncio.run(test_rotation())
