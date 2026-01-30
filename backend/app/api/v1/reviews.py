from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, Session
from app.core.database import get_session
from app.models.review import Review, ReviewCreate, ReviewUpdate
from app.models.user import User
from app.api.deps import get_current_user
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from app.core.config import get_settings

router = APIRouter()

@router.get("/", response_model=List[Review])
async def read_reviews(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    query = select(Review).where(Review.hotel_id == current_user.hotel_id).offset(skip).limit(limit)
    reviews = session.exec(query).all()
    return reviews

@router.post("/ingest", response_model=List[Review])
async def ingest_reviews(
    reviews: List[ReviewCreate],
    session: Session = Depends(get_session),
    # current_user: User = Depends(get_current_user), # Temporarily disabled for easier Extension access
):
    """
    Ingest reviews scraped by the extension.
    Avoids duplicates based on Source + Guest Name + Text hash (simplified check).
    """
    # Fallback to first hotel if no user
    from app.models.hotel import Hotel
    hotel = session.exec(select(Hotel)).first()
    if not hotel:
        raise HTTPException(status_code=400, detail="No hotel found in system")
    
    hotel_id = hotel.id

    saved_reviews = []
    for r in reviews:
        # Simple duplicate check: search for same guest and text
        # In production, specialized mix of date/id is better
        existing = session.exec(select(Review).where(
            Review.hotel_id == hotel_id,
            Review.guest_name == r.guest_name,
            Review.review_text == r.review_text
        )).first()
        
        if not existing:
            db_review = Review.from_orm(r)
            db_review.hotel_id = hotel_id
            session.add(db_review)
            saved_reviews.append(db_review)
    
    session.commit()
    for r in saved_reviews:
        session.refresh(r)
    return saved_reviews

@router.post("/{review_id}/generate-reply", response_model=Review)
async def generate_reply(
    review_id: int,
    session: Session = Depends(get_session),
    # current_user: User = Depends(get_current_user),
):
    review = session.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    settings = get_settings()
    llm = ChatOllama(
        model="llama3", 
        temperature=0.7,
        base_url=settings.OLLAMA_API_KEY if settings.OLLAMA_API_KEY and "http" in settings.OLLAMA_API_KEY else None 
        # Note: OLLAMA_API_KEY in this project seems to be used loosely or as a URL/Key placeholder. 
        # Standard Ollama runs on localhost:11434. 
    )

    system_prompt = """You are a professional, empathetic hotel manager. 
    Your task is to write a reply to a guest review.
    - If the review is positive, thank them and invite them back.
    - If negative, apologize sincerely, mention you are looking into it, and invite them to contact you directly.
    - Keep it concise (max 3-4 sentences).
    - Do not use placeholders like [Your Name]. Sign off as 'General Manager'."""

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Guest Review ({review.rating}/5): {review.review_text}")
    ])
    
    review.ai_reply_draft = response.content
    review.status = "DRAFTED"
    session.add(review)
    session.commit()
    session.refresh(review)
    return review

@router.put("/{review_id}", response_model=Review)
async def update_review(
    review_id: int,
    review_in: ReviewUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    review = session.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    review_data = review_in.dict(exclude_unset=True)
    for key, value in review_data.items():
        setattr(review, key, value)
    
    session.add(review)
    session.commit()
    session.refresh(review)
    return review
