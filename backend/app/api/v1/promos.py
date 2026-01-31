from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, date

from app.database import get_session
from app.models.promo import PromoCode
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/", response_model=List[PromoCode])
async def list_promos(
    hotel_id: Optional[str] = None,
    session: Session = Depends(get_session),
    # current_user = Depends(get_current_user) # Optional security
):
    """List all promo codes for a hotel"""
    query = select(PromoCode)
    if hotel_id:
        query = query.where(PromoCode.hotel_id == hotel_id)
    return session.exec(query).all()

@router.post("/", response_model=PromoCode)
async def create_promo(
    promo: PromoCode,
    session: Session = Depends(get_session)
):
    """Create a new promo code"""
    # Check if code exists
    existing = session.exec(select(PromoCode).where(
        PromoCode.code == promo.code,
        PromoCode.hotel_id == promo.hotel_id
    )).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Promo code already exists")
        
    session.add(promo)
    session.commit()
    session.refresh(promo)
    return promo

@router.delete("/{promo_id}")
async def delete_promo(
    promo_id: str,
    session: Session = Depends(get_session)
):
    """Delete a promo code"""
    promo = session.get(PromoCode, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promo not found")
        
    session.delete(promo)
    session.commit()
    return {"ok": True}

@router.post("/validate")
async def validate_promo(
    code: str,
    hotel_id: str,
    booking_amount: float,
    session: Session = Depends(get_session)
):
    """
    Validate a promo code and calculate discount.
    Returns: { "valid": bool, "discount": float, "final_amount": float, "message": str }
    """
    promo = session.exec(select(PromoCode).where(
        PromoCode.code == code,
        PromoCode.hotel_id == hotel_id,
        PromoCode.is_active == True
    )).first()
    
    if not promo:
        return {"valid": False, "message": "Invalid coupon code", "discount": 0}
        
    # Check Dates
    today = date.today()
    if promo.start_date and today < promo.start_date:
        return {"valid": False, "message": "Coupon not yet active", "discount": 0}
    if promo.end_date and today > promo.end_date:
        return {"valid": False, "message": "Coupon expired", "discount": 0}
        
    # Check Usage
    if promo.max_usage is not None and promo.current_usage >= promo.max_usage:
        return {"valid": False, "message": "Coupon usage limit exceeded", "discount": 0}
        
    # Calculate Discount
    discount = 0.0
    if promo.discount_type == "percentage":
        discount = (booking_amount * promo.discount_value) / 100
    else:
        discount = promo.discount_value
        
    # Ensure discount doesn't exceed total amount
    if discount > booking_amount:
        discount = booking_amount
        
    return {
        "valid": True,
        "code": promo.code,
        "discount": round(discount, 2),
        "final_amount": round(booking_amount - discount, 2),
        "message": "Coupon applied successfully!"
    }
