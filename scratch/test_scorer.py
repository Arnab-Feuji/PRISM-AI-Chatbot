import asyncio
import json
from backend.core.quality.response_quality import ResponseQualityScorer

async def test_quality_scorer_long_context():
    scorer = ResponseQualityScorer()
    query = "What is the specific monitoring requirement for drug XYZ mentioned in the protocol?"
    
    # Key info is at the very end of a 1200+ character chunk
    filler = "Lorem ipsum " * 100
    long_text = filler + " The protocol specifically requires monthly liver function tests (LFTs) for patients on drug XYZ."
    
    response = "Patients taking drug XYZ must undergo monthly liver function tests (LFTs) according to the protocol."
    
    chunks = [{"text": long_text, "rerank_score": 0.99}]
    
    print("Testing LLM-as-Judge with LONG context (key info at character 1200+)...")
    result = scorer.score_llm_judge(query, response, chunks)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    asyncio.run(test_quality_scorer_long_context())
