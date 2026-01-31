from typing import List, Optional
import hashlib
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, SQLModel
from app.core.database import get_session, async_session
from app.models.review import Review, ReviewCreate, ReviewUpdate
from app.models.user import User
from app.models.hotel import Hotel
from app.api.deps import get_current_user
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from app.core.config import get_settings

router = APIRouter()

class JobResult(SQLModel):
    status: str
    message: Optional[str] = None

def calculate_review_hash(hotel_id: str, guest_name: str, review_date: Optional[str], review_text: Optional[str]) -> str:
    """Generates a deterministic hash for deduplication."""
    g_name = guest_name or "Unknown"
    r_date = review_date or "Unknown"
    r_text = review_text or ""
    raw_str = f"{hotel_id}|{g_name}|{r_date}|{r_text}"
    return hashlib.sha256(raw_str.encode()).hexdigest()

async def generate_reply_logic(review_id: int):
    """Background task to generate AI reply."""
    async with async_session() as session:
        try:
            result = await session.execute(select(Review).where(Review.id == review_id))
            review = result.scalars().first()
            if not review:
                return

            settings = get_settings()
            # Use a timeout or handle connection errors
            llm = ChatOllama(
                model="llama3",
                temperature=0.7,
                base_url=settings.OLLAMA_API_KEY if settings.OLLAMA_API_KEY and "http" in settings.OLLAMA_API_KEY else None
            )

            system_prompt = """You are a professional, empathetic hotel manager.
            Your task is to write a reply to a guest review.
            - If the review is positive, thank them and invite them back.
            - If negative, apologize sincerely, mention you are looking into it, and invite them to contact you directly.
            - Keep it concise (max 3-4 sentences).
            - Do not use placeholders like [Your Name]. Sign off as 'General Manager'."""

            # Since invoke is sync in many langchain versions, we might need run_in_executor if it blocks.
            # But recent langchain-ollama might support async?
            # llm.ainvoke is available in LangChain Core.
            response = await llm.ainvoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"Guest Review ({review.rating}/5): {review.review_text}")
            ])

            review.ai_reply_draft = response.content
            review.status = "DRAFTED"
            session.add(review)
            await session.commit()
            print(f"AI Reply generated for Review {review_id}")

        except Exception as e:
            print(f"Failed to generate AI reply for {review_id}: {e}")
            # Optional: Update review status to FAILED or similar

@router.get("/", response_model=List[Review])
async def read_reviews(
    skip: int = 0,
    limit: int = 100,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    query = select(Review).where(Review.hotel_id == current_user.hotel_id).offset(skip).limit(limit)
    result = await session.execute(query)
    reviews = result.scalars().all()
    return reviews

@router.post("/ingest", response_model=List[Review])
async def ingest_reviews(
    reviews: List[ReviewCreate],
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Ingest reviews scraped by the extension with Idempotency & Safety Checks.
    Requires Authentication.
    """
    hotel_id = current_user.hotel_id
    if not hotel_id:
        raise HTTPException(status_code=400, detail="User is not associated with a hotel")
    
    saved_reviews = []

    for r in reviews:
        # 1. Calculate Hash
        r_hash = calculate_review_hash(hotel_id, r.guest_name, r.review_date, r.review_text)

        # 2. Check Existence
        result_exist = await session.execute(select(Review).where(Review.review_hash == r_hash))
        existing_review = result_exist.scalars().first()
        
        if existing_review:
            # 3. Handle Updates (Status sync & URL backfill)
            needs_save = False
            if r.status == "REPLIED" and existing_review.status != "REPLIED":
                existing_review.status = "REPLIED"
                existing_review.final_reply = "Replied Externally (Detected)"
                needs_save = True

            if not existing_review.review_url and r.review_url:
                existing_review.review_url = r.review_url
                needs_save = True

            if needs_save:
                session.add(existing_review)
            continue
        
        # 4. Create New Review
        review_data = r.dict()
        review_data["hotel_id"] = hotel_id
        review_data["review_hash"] = r_hash
        if review_data.get("status") != "REPLIED":
            review_data["status"] = "PENDING"

        db_review = Review.model_validate(review_data)
        session.add(db_review)
        saved_reviews.append(db_review)
    
    await session.commit()

    # 5. Trigger AI Drafts
    for r in saved_reviews:
        await session.refresh(r)
        if r.status == "PENDING":
            background_tasks.add_task(generate_reply_logic, r.id)

    return saved_reviews

@router.post("/{review_id}/generate-reply", response_model=Review)
async def generate_reply(
    review_id: int,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Review).where(Review.id == review_id))
    review = result.scalars().first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Trigger logic directly via calling the background function?
    # Or just execute logic inline for immediate feedback.
    # Inline is better for this endpoint.

    settings = get_settings()
    llm = ChatOllama(
        model="llama3", 
        temperature=0.7,
        base_url=settings.OLLAMA_API_KEY if settings.OLLAMA_API_KEY and "http" in settings.OLLAMA_API_KEY else None 
    )
    
    try:
        response = await llm.ainvoke([
            SystemMessage(content="You are a professional, empathetic hotel manager. Write a short reply."),
            HumanMessage(content=f"Guest Review ({review.rating}/5): {review.review_text}")
        ])
        review.ai_reply_draft = response.content
        review.status = "DRAFTED"
        session.add(review)
        await session.commit()
        await session.refresh(review)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return review

@router.put("/{review_id}", response_model=Review)
async def update_review(
    review_id: int,
    review_in: ReviewUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(select(Review).where(Review.id == review_id))
    review = result.scalars().first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    review_data = review_in.dict(exclude_unset=True)
    for key, value in review_data.items():
        setattr(review, key, value)
    
    session.add(review)
    await session.commit()
    await session.refresh(review)
    return review

@router.get("/jobs/pending", response_model=List[Review])
async def get_pending_reply_jobs(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch approved reviews that are waiting to be replied to.
    Limits to 5 to avoid overloading extension.
    """
    # Fetch APPROVED reviews for current user's hotel
    query = select(Review).where(
        Review.status == "APPROVED",
        Review.hotel_id == current_user.hotel_id
    ).limit(5)
    result = await session.execute(query)
    reviews = result.scalars().all()
    return reviews

@router.post("/jobs/{review_id}/result", response_model=Review)
async def report_job_result(
    review_id: int,
    job_result: JobResult,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Ensure review belongs to user's hotel
    result = await session.execute(select(Review).where(
        Review.id == review_id,
        Review.hotel_id == current_user.hotel_id
    ))
    review = result.scalars().first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    if job_result.status == "success":
        review.status = "REPLIED"
        # Optional: Append timestamp or details
        if job_result.message:
            review.reply_status_message = job_result.message
    else:
        review.status = "FAILED"
        review.reply_status_message = job_result.message

    session.add(review)
    await session.commit()
    await session.refresh(review)
    return review
