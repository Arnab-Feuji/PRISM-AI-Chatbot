import sys
from pathlib import Path
root = Path(r"c:\PRISM-RAG-CHATBOT\PRISM_Complete_Package\PRISM_Complete_Package\prism5_Black_&_Pink_One_Sprint3.4")
sys.path.append(str(root))

try:
    from backend.main import app
    print("Backend imported successfully!")
except Exception as e:
    import traceback
    traceback.print_exc()
