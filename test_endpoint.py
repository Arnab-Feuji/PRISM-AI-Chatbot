import requests
import json

try:
    # Since we don't have a valid admin token here, we might just test the DB directly again
    # or the endpoint if auth isn't strict locally.
    res = requests.get("http://localhost:8000/api/admin/prerag/report")
    print("Status:", res.status_code)
    print("Response:", json.dumps(res.json(), indent=2))
except Exception as e:
    print("Error:", e)
