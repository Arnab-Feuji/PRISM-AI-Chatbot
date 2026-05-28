import asyncio
import uuid
from sqlalchemy import select
from backend.database.models import AsyncSession, IndexedDocument
from backend.core.rag.hyde_query_transformer import PRISMFullRAGPipeline
from backend.core.rag.hybrid_chunker import HybridChunker
from backend.core.rag.pipeline import get_chroma
from backend.core.crawlers.pubmed_crawler import PubMedCrawler

async def reindex_all():
    print("="*80)
    print("PRISM RE-INDEXING TOOL")
    print("="*80)
    
    chroma_client = get_chroma()
    deleted_collections = set()
    
    async with AsyncSession() as session:
        res = await session.execute(select(IndexedDocument))
        docs = res.scalars().all()
        print(f"Found {len(docs)} documents to re-index")
        
        crawler = PubMedCrawler()
        
        for doc in docs:
            print(f"\nProcessing: {doc.title}")
            
            # 1. Fetch text (since it's not in DB)
            if doc.doc_type == "pubmed_abstract":
                pmid = doc.source.split("PMID:")[-1].strip()
                print(f"  Fetching PubMed PMID: {pmid}")
                fetched = crawler._fetch_abstracts([pmid])
                if not fetched:
                    print(f"  Failed to fetch PMID {pmid}")
                    continue
                text = fetched[0]["abstract"]
            else:
                print(f"  Skipping non-pubmed document (type: {doc.doc_type})")
                continue
                
            if not text:
                print("  No text found.")
                continue
                
            # 2. Re-index using HybridChunker
            agent_id = doc.agent_id
            collection_name = doc.collection_name
            
            chunker = HybridChunker(agent_id=agent_id)
            try:
                # Delete old collection ONLY ONCE per agent
                if collection_name not in deleted_collections:
                    try:
                        chroma_client.delete_collection(collection_name)
                        print(f"  Deleted old collection: {collection_name}")
                    except:
                        pass
                    deleted_collections.add(collection_name)
                    
                collection = chroma_client.get_or_create_collection(collection_name)
                
                # Chunk and index
                result = chunker.chunk_document(text, source_doc=doc.title)
                chunker.index_to_chromadb(result, collection)
                
                print(f"  Indexed: {result.total_children} children, {result.total_parents} parents")
                
                # Update DB record
                doc.chunk_count = result.total_children
                doc.token_count = sum(c.token_estimate for c in result.children)
                
            except Exception as e:
                print(f"  Error indexing: {e}")
                
        await session.commit()
        print("\nRe-indexing complete.")

if __name__ == "__main__":
    asyncio.run(reindex_all())
