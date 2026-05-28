import asyncio
import os
import json
import time
from typing import List, Dict
from backend.core.rag.hyde_query_transformer import PRISMFullRAGPipeline
from backend.core.rag.pipeline import get_chroma
from backend.core.quality.response_quality import ResponseQualityScorer

# Mock dataset for evaluation
EVAL_DATASET = [
    {
        "query": "What are the common side effects of Metformin?",
        "ground_truth": "Common side effects of Metformin include gastrointestinal issues such as nausea, diarrhea, stomach pain, and a metallic taste in the mouth. In rare cases, it can cause lactic acidosis."
    },
    {
        "query": "How often should I monitor my blood glucose if I have Type 2 Diabetes?",
        "ground_truth": "For Type 2 Diabetes, monitoring frequency depends on your treatment plan. Generally, it's recommended to check at least once a day, often before breakfast or before/after meals if on insulin."
    },
    {
        "query": "What is the role of HbA1c in diabetes management?",
        "ground_truth": "HbA1c measures average blood sugar levels over the past 2-3 months. It helps determine how well diabetes is being controlled over time and guides treatment adjustments."
    }
]

async def evaluate_prism_rag():
    print("="*80)
    print("PRISM RAGAS EVALUATION — NEW ENHANCED PIPELINE")
    print("="*80)
    
    pipeline = PRISMFullRAGPipeline()
    chroma_client = get_chroma()
    quality_scorer = ResponseQualityScorer()
    
    results = []
    
    for i, item in enumerate(EVAL_DATASET):
        print(f"\n[{i+1}/{len(EVAL_DATASET)}] Query: {item['query']}")
        
        t0 = time.time()
        # 1. Run the enhanced pipeline
        retrieval = await pipeline.retrieve(
            query=item["query"],
            agent_id="DM1",
            language="en",
            chromadb_client=chroma_client,
            use_hyde=True,
            collection_name="prism_dm_01_monitoring"
        )
        
        # 2. Get LLM response (mocking the router logic or calling it)
        # For simplicity, we'll use a basic LLM call with the retrieved context
        from backend.core.agents.base_agent import call_llm_sync
        
        system_prompt = "You are a helpful medical assistant. Use the provided context to answer the question."
        user_message = f"CONTEXT:\n{retrieval['context']}\n\nQUESTION: {item['query']}"
        
        llm_res = call_llm_sync(
            system_prompt=system_prompt,
            user_message=user_message,
            history=[],
            temperature=0.0
        )
        
        response = llm_res.get("response", "Error generating response")
        latency = (time.time() - t0) * 1000
        
        # 3. Score with RAGAS (using the new LLM-as-judge scorer)
        # Note: The existing quality_scorer in response_quality.py already implements RAGAS-like dimensions
        scores = quality_scorer.score_llm_judge(
            query=item["query"],
            response=response,
            chunks=retrieval["chunks"]
        )
        
        print(f"Latency: {latency:.0f}ms")
        print(f"Faithfulness: {scores['faithfulness']}")
        print(f"Context Precision: {scores['context_precision']}")
        print(f"Overall Score: {scores['overall']}")
        
        results.append({
            "query": item["query"],
            "response": response,
            "scores": scores,
            "retrieval": {
                "hyde_used": retrieval["hyde_used"],
                "reranker": retrieval["reranker_backend"],
                "confidence": retrieval["confidence"]
            }
        })

    # Summary
    avg_faith = sum(r["scores"]["faithfulness"] for r in results) / len(results)
    avg_prec = sum(r["scores"]["context_precision"] for r in results) / len(results)
    avg_overall = sum(r["scores"]["overall"] for r in results) / len(results)
    
    print("\n" + "="*80)
    print("FINAL RAGAS METRICS SUMMARY")
    print("-"*80)
    print(f"Average Faithfulness:     {avg_faith:.4f} (Target: >0.75)")
    print(f"Average Context Precision: {avg_prec:.4f} (Target: >0.75)")
    print(f"Average Composite Score:  {avg_overall:.4f}")
    print("="*80)

if __name__ == "__main__":
    asyncio.run(evaluate_prism_rag())
