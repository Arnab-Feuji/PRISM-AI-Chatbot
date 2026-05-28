import os
import sys
from pathlib import Path

# Add the project root to sys.path
root = Path(r"c:\PRISM-RAG-CHATBOT\PRISM_Complete_Package\PRISM_Complete_Package\prism5_Black_&_Pink_One_Sprint3.4")
sys.path.append(str(root))

from backend.config.settings import get_settings
from backend.core.rag.pipeline import get_rag_pipeline

settings = get_settings()
print(f"Chroma Persist Dir: {settings.chroma_persist_dir}")

try:
    pipeline = get_rag_pipeline()
    client = pipeline.store.client
    print(f"Client Type: {type(client)}")
    cols = client.list_collections()
    print(f"Connected to ChromaDB. Found {len(cols)} collections.")
    for col in cols:
        print(f" - {col.name}: {col.count()} docs")
except Exception as e:
    print(f"ChromaDB Error: {e}")
