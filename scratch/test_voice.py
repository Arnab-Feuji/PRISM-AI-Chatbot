import os
import sys
from pathlib import Path

# Add the project root to sys.path
root = Path(r"c:\PRISM-RAG-CHATBOT\PRISM_Complete_Package\PRISM_Complete_Package\prism5_Black_&_Pink_One_Sprint3.4")
sys.path.append(str(root))

from backend.config.settings import get_settings
import openai

settings = get_settings()
print(f"OpenAI API Key: {settings.openai_api_key[:10]}...")

try:
    client = openai.OpenAI(api_key=settings.openai_api_key)
    # Just list models to verify key
    models = client.models.list()
    print(f"Connected to OpenAI. Found {len(list(models))} models.")
except Exception as e:
    print(f"OpenAI Error: {e}")
