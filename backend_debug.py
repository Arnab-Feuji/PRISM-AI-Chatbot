import sys
import os
sys.path.append(os.getcwd())
print("Starting import...")
try:
    from backend.main import app
    print("Backend Loaded Successfully")
except Exception as e:
    import traceback
    traceback.print_exc()
