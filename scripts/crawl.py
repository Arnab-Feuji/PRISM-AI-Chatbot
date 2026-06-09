#!/usr/bin/env python3

"""PRISM — Bulk Knowledge Base Crawl

Crawls PubMed for all 25 primary agents and ingests into dedicated ChromaDB collections.

Run: python scripts/crawl.py [--agent CA1] [--source pubmed|cdc] [--max 10]

"""

import asyncio, sys, os, argparse, time, uuid



sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))



from backend.config.disease_config import PRIMARY_AGENTS, AGENTS

from backend.core.rag.pipeline import get_rag_pipeline

from backend.core.crawlers.pubmed_crawler import PubMedCrawler, CDCCrawler

from backend.core.guardrails.prerag_gate import get_prerag_gate

from backend.database.models import AsyncSession, IndexedDocument, PreRAGResult, create_tables

from backend.main import calculate_prerag_report





async def persist_crawled_doc(agent, doc: dict, text: str, meta: dict, chunks_added: int, source: str):

    report = calculate_prerag_report(text, meta)

    doc_type = doc.get("doc_type", source)

    origin = "crawl_pubmed" if source == "pubmed" else "crawl_cdc"



    async with AsyncSession() as session:

        db_doc = IndexedDocument(

            id=str(uuid.uuid4()),

            title=doc.get("title", "Untitled")[:1000],

            source=doc.get("source", source)[:500],

            source_url=(doc.get("source_url") or "")[:2000] or None,

            collection_name=agent.collection_name,

            agent_id=agent.agent_id,

            disease_code=agent.disease_code,

            doc_type=doc_type,

            publication_year=doc.get("year"),

            chunk_count=chunks_added,

            token_count=int(len(text.split()) * 1.3),

            prerag_score=report["total_score"],

            prerag_tier=report["quality_standard"],

            metadata_json={"ingest_origin": origin},

        )

        session.add(db_doc)

        session.add(PreRAGResult(

            id=str(uuid.uuid4()),

            document_id=db_doc.id,

            doc_title=db_doc.title,

            agent_id=agent.agent_id,

            total_score=report["total_score"],

            tier1_score=report["tier1_score"],

            tier2_score=report["tier2_score"],

            quality_standard=report["quality_standard"],

            dim_scores=report["dim_scores"],

            reject_reasons=report["reject_reasons"],

        ))

        await session.commit()





async def crawl_agent(agent_id: str, source: str, max_results: int, verbose: bool):

    agent = AGENTS.get(agent_id)

    if not agent:

        print(f"  WARN: Agent {agent_id} not found")

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

                "title":          doc.get("title", "Untitled"),

                "year":           doc.get("year"),

                "source_url":     doc.get("source_url", ""),

                "doc_type":       doc.get("doc_type", ""),

                "agent_scope":    agent_id,

                "evidence_grade": "B",

            }

            score = gate.evaluate(text, meta)

            if gate.should_ingest(score):

                result = pipeline.ingest(text, meta, agent.collection_name)

                await persist_crawled_doc(agent, doc, text, meta, result["chunks_added"], source)

                total_added += result["chunks_added"]

                if verbose:

                    print(f"      OK  {doc.get('title','?')[:50]} | {score.quality_std} ({score.total_score:.0f}pts) | +{result['chunks_added']} chunks")

            else:

                if verbose:

                    print(f"      SKIP {doc.get('title','?')[:40]} | {score.quality_std} | Reasons: {score.reject_reasons[:1]}")



        time.sleep(0.5)  # Rate limit



    return total_added





async def main():

    parser = argparse.ArgumentParser(description="PRISM Knowledge Base Crawler")

    parser.add_argument("--agent",  type=str, default="all",   help="Agent ID or 'all'")

    parser.add_argument("--source", type=str, default="pubmed", choices=["pubmed","cdc"])

    parser.add_argument("--max",    type=int, default=5,        help="Max articles per query")

    parser.add_argument("--verbose",action="store_true",        help="Verbose output")

    args = parser.parse_args()



    await create_tables()



    print("PRISM Knowledge Base Crawler")

    print(f"   Source:  {args.source.upper()}")

    print(f"   Max:     {args.max} articles/query")

    print("=" * 50)



    agents = list(PRIMARY_AGENTS.keys()) if args.agent == "all" else [args.agent.upper()]



    total = 0

    for aid in agents:

        print(f"\nAgent {aid}...")

        added = await crawl_agent(aid, args.source, args.max, args.verbose)

        print(f"   +{added} chunks added")

        total += added

        time.sleep(1)



    print(f"\nCrawl complete. Total chunks added: {total}")





if __name__ == "__main__":

    asyncio.run(main())

