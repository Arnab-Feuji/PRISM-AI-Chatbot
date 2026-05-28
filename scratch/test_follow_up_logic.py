
import sys
import os
import json

# Add project root to sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(project_root)

from backend.core.conversation.response_engine import (
    enrich_response_context,
    ConversationMemory,
    INTENT_TAXONOMY
)

def test_follow_up_rotation():
    print("--- Testing Follow-up Rotation and Deduplication ---")
    
    # 1. Initial State
    memory = ConversationMemory(conversation_id="test_123")
    intent = "DM_LIFESTYLE_INTRO"
    history = []
    user_msg = "tell me about healthy life"
    
    print(f"User Message: {user_msg}")
    print(f"Initial Shown Questions: {memory.follow_up_asked}")
    
    # First turn
    res1 = enrich_response_context(
        agent_id="DM6",
        user_message=user_msg,
        base_system_prompt="You are a diabetes coach.",
        intent=intent,
        memory_dict=memory.to_dict(),
        slots_filled={},
        context_summary="",
        confidence=0.8,
        conversation_history=history
    )
    
    q1 = [q["text"] for q in res1["follow_up_questions"]]
    print(f"Turn 1 Suggestions: {q1}")
    
    # Simulate clicking one question
    clicked_q = q1[0]
    print(f"Patient clicks: {clicked_q}")
    
    history.append({"role": "user", "content": user_msg})
    history.append({"role": "assistant", "content": "Here is some info about healthy life."})
    
    # Second turn with the clicked question as message
    res2 = enrich_response_context(
        agent_id="DM6",
        user_message=clicked_q,
        base_system_prompt="You are a diabetes coach.",
        intent=intent,
        memory_dict=res1["memory"],
        slots_filled={},
        context_summary="",
        confidence=0.8,
        conversation_history=history
    )
    
    q2 = [q["text"] for q in res2["follow_up_questions"]]
    print(f"Turn 2 Suggestions: {q2}")
    
    # Check if clicked_q is in q2
    if clicked_q in q2:
        print("FAIL: Clicked question repeated!")
    else:
        print("SUCCESS: Clicked question was removed from suggestions.")
        
    # Check if any overlap between q1 and q2
    overlap = set(q1) & set(q2)
    print(f"Overlap between Turn 1 and Turn 2: {overlap}")
    if overlap:
        print("Note: Some overlap exists because intent pool is larger than 3.")
    
    # 3. Test Avoidance
    avoid_msg = "actually I want to talk about something totally different like my vacation"
    print(f"\n--- Testing Avoidance ---")
    print(f"User Message (Avoidance): {avoid_msg}")
    
    res3 = enrich_response_context(
        agent_id="DM6",
        user_message=avoid_msg,
        base_system_prompt="You are a diabetes coach.",
        intent=intent,
        memory_dict=res2["memory"],
        slots_filled={},
        context_summary="",
        confidence=0.8,
        conversation_history=history
    )
    
    q3 = [q["text"] for q in res3["follow_up_questions"]]
    print(f"Turn 3 Suggestions (Post-Avoidance): {q3}")
    
    memory_final = ConversationMemory.from_dict(res3["memory"])
    print(f"Avoided count: {memory_final.questions_avoided_count}")
    
    if memory_final.questions_avoided_count > 0:
        print("SUCCESS: Avoidance detected and tracked.")
    else:
        print("FAIL: Avoidance NOT detected.")

    # 4. Test Frustration
    frust_msg = "this is absolutely useless and I am very frustrated with your nonsense"
    print(f"\n--- Testing Frustration (Empathy Mode) ---")
    print(f"User Message (Frustrated): {frust_msg}")
    
    res4 = enrich_response_context(
        agent_id="DM6",
        user_message=frust_msg,
        base_system_prompt="You are a diabetes coach.",
        intent=intent,
        memory_dict=res3["memory"],
        slots_filled={},
        context_summary="",
        confidence=0.8,
        conversation_history=history
    )
    
    q4 = [q["text"] for q in res4["follow_up_questions"]]
    print(f"Turn 4 Suggestions (Empathetic): {q4}")
    
    from backend.core.conversation.response_engine import DISEASE_EMPATHY_QUESTIONS
    empathy_pool = DISEASE_EMPATHY_QUESTIONS["DM"]
    
    is_empathetic = any(q in empathy_pool for q in q4)
    if is_empathetic:
        print("SUCCESS: Empathetic questions detected.")
    else:
        print("FAIL: No empathetic questions found.")
        
    # Check anti-repetition during frustration
    all_seen = set(res4["memory"]["follow_up_asked"])
    print(f"Total seen questions: {len(all_seen)}")
    if any(q in set(q1) | set(q2) | set(q3) for q in q4):
        print("FAIL: Repeated question found during frustration!")
    else:
        print("SUCCESS: No repeats found during frustration.")

if __name__ == "__main__":
    test_follow_up_logic()
