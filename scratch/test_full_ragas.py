import asyncio
import json
from backend.core.quality.response_quality import ResponseQualityScorer

async def test_full_ragas():
    scorer = ResponseQualityScorer()
    query = "How do I manage my type 2 diabetes?"
    response = "Type 2 diabetes is managed through blood sugar monitoring, healthy eating, regular exercise, and potentially medication or insulin therapy. It is important to work closely with your healthcare provider to develop a personalized plan."
    chunks = [
        {"text": "Diabetes management involves lifestyle changes and medical supervision. Blood sugar control is key.", "rerank_score": 0.95},
        {"text": "Type 2 diabetes patients often require metformin or other oral medications.", "rerank_score": 0.88}
    ]
    
    print("Running full RAGAS evaluation...")
    # Note: score_llm_judge is synchronous but calls call_llm_sync
    result = scorer.score_llm_judge(query, response, chunks)
    
    print("\nResult Keys:", list(result.keys()))
    print("\nFull Result JSON:")
    print(json.dumps(result, indent=2))
    
    # Check for a few critical new fields
    expected_new = ["noise_sensitivity", "harmlessness", "bert_score"]
    missing = [k for k in expected_new if k not in result]
    
    if not missing:
        print("\n✅ All 22+ dimensions successfully returned!")
    else:
        print(f"\n❌ Missing dimensions: {missing}")

if __name__ == "__main__":
    asyncio.run(test_full_ragas())
