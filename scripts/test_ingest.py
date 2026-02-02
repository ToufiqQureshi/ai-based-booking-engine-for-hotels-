import requests
import json
from datetime import date

url = "http://127.0.0.1:8001/api/v1/competitors/rates/ingest"

# 1. Get a valid competitor ID first? 
# We'll just use a fake UUID if validation allows, or fetch one.
# But for 422 validation, UUID format matters usually.

payload = {
    "rates": [
        {
            "competitor_id": "a5bdfa06-266d-45b5-995d-6808194c599a", # Example UUID from logs
            "check_in_date": "2026-02-06",
            "price": 5000.0,
            "room_type": "Standard",
            "is_sold_out": False,
            "currency": "INR"
        }
    ]
}

print(f"Sending payload: {json.dumps(payload, indent=2)}")

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
