#!/usr/bin/env python3
"""PRISM — Bulk Knowledge Base Crawl
Crawls PubMed for all 25 primary agents and ingests into dedicated ChromaDB collections.
Run: python scripts/crawl.py [--agent CA1] [--source pubmed|cdc] [--max 10]
"""
import asyncio, sys, os, argparse, time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from config.disease_config import PRIMARY_AGENTS
from core.rag.pipeline import get_rag_pipeline
from core.crawlers.pubmed_crawler import PubMedCrawler, CDCCrawler
from core.guardrails.prerag_gate import get_prerag_gate


async def crawl_agent(agent_id: str, source: str, max_results: int, verbose: bool):
    from config.disease_config import AGENTS
    agent = AGENTS.get(agent_id)
    if not agent:
        print(f"  ⚠  Agent {agent_id} not found")
        return 0

    pipeline = get_rag_pipeline()
    gate     = get_prerag_gate()

    queries = agent.evidence_sources[:3] if agent.evidence_sources else [f"{agent.name} clinical guidelines"]

    total_added = 0
    for query in queries:
        if verbose: print(f"    Query: {query}")
        if source == "pubmed":
            docs = PubMedCrawler().search(query, max_results)
        else:
            docs = CDCCrawler().crawl(agent.disease_code)

        for doc in docs:
            text = doc.get("abstract") or doc.get("text", "")
            if len(text.strip()) < 100:
                continue
            meta = {
                "source":         doc.get("source", ""),
                "year":           doc.get("year"),
                "source_url":     doc.get("source_url", ""),
                "doc_type":       doc.get("doc_type", ""),
                "agent_scope":    agent_id,
                "evidence_grade": "B",
            }
            score = gate.evaluate(text, meta)
            if gate.should_ingest(score):
                result = pipeline.ingest(text, meta, agent.collection_name)
                total_added += result["chunks_added"]
                if verbose:
                    print(f"      ✓ {doc.get('title','?')[:50]} | {score.quality_std} ({score.total_score:.0f}pts) | +{result['chunks_added']} chunks")
            else:
                if verbose:
                    print(f"      ✕ REJECTED: {doc.get('title','?')[:40]} | {score.quality_std} | Reasons: {score.reject_reasons[:1]}")

        time.sleep(0.5)  # Rate limit

    return total_added


async def main():
    parser = argparse.ArgumentParser(description="PRISM Knowledge Base Crawler")
    parser.add_argument("--agent",  type=str, default="all",   help="Agent ID or 'all'")
    parser.add_argument("--source", type=str, default="pubmed", choices=["pubmed","cdc"])
    parser.add_argument("--max",    type=int, default=5,        help="Max articles per query")
    parser.add_argument("--verbose",action="store_true",        help="Verbose output")
    args = parser.parse_args()

    print("🔍 PRISM Knowledge Base Crawler")
    print(f"   Source:  {args.source.upper()}")
    print(f"   Max:     {args.max} articles/query")
    print("=" * 50)

    agents = list(PRIMARY_AGENTS.keys()) if args.agent == "all" else [args.agent.upper()]

    total = 0
    for aid in agents:
        print(f"\n📚 Agent {aid}…")
        added = await crawl_agent(aid, args.source, args.max, args.verbose)
        print(f"   +{added} chunks added")
        total += added
        time.sleep(1)

    print(f"\n✅ Crawl complete! Total chunks added: {total}")


if __name__ == "__main__":
    asyncio.run(main())
