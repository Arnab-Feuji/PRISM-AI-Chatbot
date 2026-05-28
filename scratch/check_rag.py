import os
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).resolve().parent.parent / "backend"))

from core.rag.pipeline import get_rag_pipeline
from config.disease_config import ALL_COLLECTIONS

def check_vector_store():
    pipeline = get_rag_pipeline()
    print("Vector Store Stats:")
    total = 0
    for col in ALL_COLLECTIONS:
        count = pipeline.store.count(col)
        if count > 0:
            print(f"  - {col}: {count} chunks")
            total += count
    
    if total == 0:
        print("\n[WARNING] All collections are EMPTY. This is why confidence is 35%.")
    else:
        print(f"\nTotal chunks: {total}")

if __name__ == "__main__":
    check_vector_store()
