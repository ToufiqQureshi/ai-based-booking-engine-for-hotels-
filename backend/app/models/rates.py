"""
Rates Models
Rate Plans and Room Rates (daily pricing)
"""
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime, date
import uuid

if TYPE_CHECKING:
    from app.models.hotel import Hotel
    from app.models.room import RoomType

class RatePlanBase(SQLModel):
    name: str
    description: Optional[str] = None
    meal_plan: str = Field(default="RO")  # RO, BB, HB, FB, AI
    is_refundable: bool = True
    cancellation_hours: int = 24
    is_active: bool = True

class RatePlan(RatePlanBase, table=True):
    __tablename__ = "rate_plans"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    hotel_id: str = Field(foreign_key="hotels.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    hotel: "Hotel" = Relationship(back_populates="rate_plans")
    rates: List["RoomRate"] = Relationship(back_populates="rate_plan")

class RatePlanCreate(RatePlanBase):
    pass

class RatePlanRead(RatePlanBase):
    id: str
    hotel_id: str
    created_at: datetime


class RoomRate(SQLModel, table=True):
    __tablename__ = "room_rates"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    hotel_id: str = Field(foreign_key="hotels.id", index=True)
    room_type_id: str = Field(foreign_key="room_types.id", index=True)
    rate_plan_id: str = Field(foreign_key="rate_plans.id", index=True)
    
    date_from: date
    date_to: date
    price: float
    
    # Relationships
    rate_plan: Optional[RatePlan] = Relationship(back_populates="rates")
    room_type: "RoomType" = Relationship(back_populates="rates")

class RoomRateCreate(SQLModel):
    room_type_id: str
    rate_plan_id: str
    date_from: date
    date_to: date
    price: float

class RoomRateRead(SQLModel):
    id: str
    room_type_id: str
    rate_plan_id: str
    date_from: date
    date_to: date
    price: float
