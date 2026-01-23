from pydantic import BaseModel
from datetime import date
from typing import List, Optional

class RateDataItem(BaseModel):
    competitor_id: str
    check_in_date: date
    price: float
    room_type: str = "Standard"
    is_sold_out: bool = False
    currency: str = "INR"

class RateIngestRequest(BaseModel):
    rates: List[RateDataItem]
