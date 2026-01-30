from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Relationship

class ReviewBase(SQLModel):
    guest_name: str
    rating: float
    review_text: Optional[str] = Field(default=None)
    review_date: Optional[str] = None
    source: str = "MMT"  # MMT, Agoda, Booking
    status: str = "PENDING"  # PENDING, DRAFTED, REPLIED
    ai_reply_draft: Optional[str] = None
    final_reply: Optional[str] = None
    reply_date: Optional[datetime] = None

class Review(ReviewBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hotel_id: str = Field(foreign_key="hotels.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ReviewCreate(ReviewBase):
    pass

class ReviewUpdate(SQLModel):
    status: Optional[str] = None
    ai_reply_draft: Optional[str] = None
    final_reply: Optional[str] = None
    reply_date: Optional[datetime] = None
