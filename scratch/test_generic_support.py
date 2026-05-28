import sys
import os
import random

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.core.conversation.response_engine import enrich_response_context

def test_enrichment():
    agent_id = "MH3" # Mental Health / Insomnia
    user_message = "I can't sleep at night."
    base_system_prompt = "You are an insomnia specialist."
    intent = "MH_INSOMNIA_INITIAL"
    memory_dict = {"conversation_id": "test_conv"}
    slots_filled = {}
    context_summary = "Patient reports difficulty sleeping."
    confidence = 0.8
    conversation_history = []

    res = enrich_response_context(
        agent_id=agent_id,
        user_message=user_message,
        base_system_prompt=base_system_prompt,
        intent=intent,
        memory_dict=memory_dict,
        slots_filled=slots_filled,
        context_summary=context_summary,
        confidence=confidence,
        conversation_history=conversation_history
    )

    print("Generic Support Queries:")
    for gs in res["generic_support"]:
        print(f"- {gs['text']} (Grade: {gs['grade']}, Citation: {gs['elaboration']})")

if __name__ == "__main__":
    test_enrichment()
