from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
import random

# Separate router for Mocking External APIs
router = APIRouter(prefix="/mock-channex", tags=["Mock External APIs"])

class MockRateUpdate(BaseModel):
    rate: float
    date: str

class MockPushRequest(BaseModel):
    hotel_id: str
    rates: List[MockRateUpdate]

@router.get("/hotels/{hotel_id}")
async def get_hotel_details(hotel_id: str, user_api_key: Optional[str] = Header(None)):
    """
    Simulates Channex GET /hotels/:id
    Validation:
    - If user_api_key == "invalid_token", return 401.
    - If hotel_id == "unknown_hotel", return 404.
    - Else, return success with fake hotel data.
    """
    print(f"[Mock Channex] Received Connection Request. ID: {hotel_id}, Key: {user_api_key}")
    
    if user_api_key == "invalid_token":
        raise HTTPException(status_code=401, detail={"error": "Invalid API Key"})
        
    if hotel_id == "unknown_hotel":
        raise HTTPException(status_code=404, detail={"error": "Hotel Not Found"})
        
    return {
        "data": {
            "id": hotel_id,
            "type": "hotel",
            "attributes": {
                "title": f"Mock Hotel - {hotel_id}",
                "currency": "INR",
                "country": "IN"
            }
        }
    }

@router.post("/ari")
async def push_rates(payload: MockPushRequest, user_api_key: Optional[str] = Header(None)):
    """
    Simulates Channex Push ARI (Availability, Rates, Inventory)
    """
    print(f"[Mock Channex] Pushing Rates for {payload.hotel_id}: {len(payload.rates)} updates")
    
    if user_api_key == "invalid_token":
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Simulate Random Network Delay or partial error?
    # For now, 100% success
    return {
        "data": [
            {"id": "update_123", "status": "success"}
        ],
        "meta": {
            "processed": len(payload.rates)
        }
    }
