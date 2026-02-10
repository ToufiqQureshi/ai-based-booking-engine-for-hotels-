from typing import List, Optional, Any
from datetime import date, datetime
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlmodel import select, and_, or_
from pydantic import BaseModel, EmailStr
import uuid

from app.core.database import get_session
from app.api.deps import DbSession
from app.models.hotel import Hotel, HotelRead
from app.models.room import RoomType, RoomTypeRead, RoomBlock
from app.models.booking import Booking, BookingStatus, Guest
from app.models.rates import RatePlan
from app.models.promo import PromoCode

router = APIRouter(prefix="/public", tags=["Public"])

class RateOption(BaseModel):
    id: str # rate_plan_id
    name: str # rate_plan_name (e.g. "Room Only", "Breakfast Included")
    meal_plan_code: str
    price_per_night: float
    total_price: float
    inclusions: List[str]
    savings_text: Optional[str] = None # e.g. "Save INR 2,000"

class PublicRoomSearchResult(RoomTypeRead):
    """
    Extended room response for public search.
    Includes calculated price and availability.
    """
    available_rooms: int
    price_starting_at: float
    rate_options: List[RateOption]


# --- Public Booking Schemas ---
class PublicGuestCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str
    nationality: str = "IN"
    id_type: str = "passport"
    id_number: str = "PENDING"

class PublicRoomBooking(BaseModel):
    room_type_id: str
    room_type_name: str
    price_per_night: float
    total_price: float
    guests: int = 1
    rate_plan_id: Optional[str] = None
    rate_plan_name: Optional[str] = None

class PublicAddOn(BaseModel):
    id: str
    name: str
    price: float

class PublicBookingCreate(BaseModel):
    check_in: date
    check_out: date
    guest: PublicGuestCreate
    rooms: List[PublicRoomBooking]
    addons: List[PublicAddOn] = []
    special_requests: Optional[str] = None
    promo_code: Optional[str] = None

class PublicBookingResponse(BaseModel):
    id: str
    booking_number: str
    status: str
    check_in: date
    check_out: date
    total_amount: float
    guest: dict
    rooms: List[dict]



def generate_booking_number() -> str:
    """Unique booking number generate karta hai"""
    timestamp = datetime.utcnow().strftime("%Y%m%d")
    unique_part = str(uuid.uuid4())[:6].upper()
    return f"BK{timestamp}{unique_part}"


@router.get("/hotels/slug/{hotel_slug}", response_model=HotelRead)
async def get_public_hotel_by_slug(hotel_slug: str, session: DbSession):
    """
    Get hotel details by slug for public booking page.
    No authentication required.
    """
    query = select(Hotel).where(Hotel.slug == hotel_slug)
    result = await session.execute(query)
    hotel = result.scalar_one_or_none()
    
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return hotel


@router.get("/hotels/slug/{hotel_slug}/widget-config", response_model=dict)
async def get_widget_config(hotel_slug: str, session: DbSession):
    """
    Get configuration for the booking widget.
    Includes allowed_domains for security check.
    """
    from app.models.integration import IntegrationSettings
    
    # Get Hotel
    query = select(Hotel).where(Hotel.slug == hotel_slug)
    result = await session.execute(query)
    hotel = result.scalar_one_or_none()
    
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    # Get Integration Settings for this hotel
    settings_query = select(IntegrationSettings).where(
        IntegrationSettings.hotel_id == hotel.id
    )
    settings_res = await session.execute(settings_query)
    settings = settings_res.scalar_one_or_none()
    
    allowed_domains = ""
    widget_enabled = True
    
    if settings:
        allowed_domains = settings.allowed_domains or ""
        widget_enabled = settings.widget_enabled
        
    return {
        "hotel_name": hotel.name,
        "primary_color": hotel.primary_color,
        "allowed_domains": allowed_domains,
        "widget_enabled": widget_enabled
    }

@router.get("/hotels/{hotel_identifier}", response_model=HotelRead)
async def get_public_hotel(hotel_identifier: str, session: DbSession):
    """
    Get hotel details for public booking page.
    Supports both ID (UUID) and Slug.
    """
    # 1. Try by Slug first
    query = select(Hotel).where(Hotel.slug == hotel_identifier)
    result = await session.execute(query)
    hotel = result.scalar_one_or_none()
    
    # 2. If not found, try by ID
    if not hotel:
        hotel = await session.get(Hotel, hotel_identifier)

    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return hotel

@router.get("/hotels/{hotel_identifier}/rooms", response_model=List[PublicRoomSearchResult])
async def search_public_rooms(
    hotel_identifier: str,
    session: DbSession,
    check_in: date = Query(...),
    check_out: date = Query(...),
    guests: int = Query(2),
    promo_code: Optional[str] = Query(None)
):
    """
    Search available rooms for a hotel with multiple rate plans.
    """
    # Resolve hotel_id from identifier (slug or uuid)
    hotel_id = hotel_identifier
    
    # Check if it looks like a valid UUID? 
    # Or just try to find by slug if it fails?
    # Better: Try finding hotel by slug, if not found, assume it is ID.
    
    print(f"DEBUG: Searching rooms for identifier: {hotel_identifier}")
    hotel_query = select(Hotel).where(Hotel.slug == hotel_identifier)
    hotel_res = await session.execute(hotel_query)
    hotel = hotel_res.scalar_one_or_none()
    
    if hotel:
        hotel_id = hotel.id
        print(f"DEBUG: Found hotel by slug. ID: {hotel_id}")
    else:
        print(f"DEBUG: Hotel not found by slug, using identifier: {hotel_identifier}")
        pass

    # 1. Get all room types
    query = select(RoomType).where(
        RoomType.hotel_id == hotel_id,
        RoomType.is_active == True
    )
    result = await session.execute(query)
    room_types = result.scalars().all()
    print(f"DEBUG: Found {len(room_types)} room types")
    
    if not room_types:
        return []

    # --- FIX: Fetch Amenities real-time (Source of Truth) ---
    # The JSON column 'amenities' might be desynced.
    # We fetch links and amenities manually to ensure accuracy.
    from app.models.amenity import Amenity, RoomAmenityLink
    
    room_ids = [r.id for r in room_types]
    room_amenity_map = {}
    
    if room_ids:
        # 1. Get Links
        link_stmt = select(RoomAmenityLink).where(RoomAmenityLink.room_id.in_(room_ids))
        link_res = await session.execute(link_stmt)
        links = link_res.scalars().all()

        # 2. Get Amenities
        amenity_ids = {link.amenity_id for link in links}
        if amenity_ids:
            am_stmt = select(Amenity).where(Amenity.id.in_(amenity_ids))
            am_res = await session.execute(am_stmt)
            # Create dict for fast lookup
            amenities_dict = {a.id: a for a in am_res.scalars().all()}
            
            # 3. Map to rooms
            for link in links:
                if link.amenity_id in amenities_dict:
                    a = amenities_dict[link.amenity_id]
                    if link.room_id not in room_amenity_map:
                        room_amenity_map[link.room_id] = []

                    # Format as expected by frontend
                    room_amenity_map[link.room_id].append({
                        "id": a.id,
                        "name": a.name,
                        "icon": a.icon_slug,
                        "category": a.category,
                        "is_featured": a.is_featured
                    })

    # 1b. Get all Rate Plans
    rp_query = select(RatePlan).where(RatePlan.hotel_id == hotel_id, RatePlan.is_active == True)
    rp_result = await session.execute(rp_query)
    rate_plans = rp_result.scalars().all()

    # If no rate plans exist, create virtual ones for display logic
    if not rate_plans:
        # We will create a "Standard Rate" logic dynamically if DB is empty
        pass

    # 2. Get overlapping bookings
    booking_query = select(Booking).where(
        Booking.hotel_id == hotel_id,
        Booking.status != BookingStatus.CANCELLED,
        and_(
            Booking.check_in < check_out,
            Booking.check_out > check_in
        )
    )
    booking_result = await session.execute(booking_query)
    existing_bookings = booking_result.scalars().all()

    # 3. Get overlapping blocks
    block_query = select(RoomBlock).where(
        RoomBlock.hotel_id == hotel_id,
        and_(
            RoomBlock.start_date <= check_out,
            RoomBlock.end_date >= check_in
        )
    )
    block_result = await session.execute(block_query)
    existing_blocks = block_result.scalars().all()

    # 4b. Check for Promo Code
    promo = None
    if promo_code:
        promo_query = select(PromoCode).where(
            PromoCode.hotel_id == hotel_id,
            PromoCode.code == promo_code,
            PromoCode.is_active == True
        )
        promo_res = await session.execute(promo_query)
        promo = promo_res.scalar_one_or_none()

    available_rooms_list = []
    nights = (check_out - check_in).days
    if nights < 1: nights = 1

    for rt in room_types:
        if rt.max_occupancy >= guests:
            # Availability Logic
            booked_count = 0
            for booking in existing_bookings:
                for r_booked in booking.rooms:
                    if r_booked.get("room_type_id") == rt.id:
                        booked_count += 1
            
            blocked_count = 0
            for block in existing_blocks:
                if block.room_type_id == rt.id:
                    blocked_count += block.blocked_count
            
            total_taken = booked_count + blocked_count
            available = rt.total_inventory - total_taken

            if available > 0:
                # CALCULATE RATES
                rate_options = []
                base_price_total = float(rt.base_price) * nights

                # Logic A: If we have explicit Rate Plans
                if rate_plans:
                    for plan in rate_plans:
                        # Simple Logic:
                        # RO = Base Price
                        # CP = Base + 200 * guests
                        # MAP = Base + 500 * guests
                        # AP = Base + 800 * guests
                        # (Real logic should check RoomRate table, but for MVP we derive)
                        
                        plan_modifier = 0
                        inclusions = []
                        meal_code = plan.meal_plan
                        
                        if meal_code == "RO":
                            inclusions = ["Room Only", "Free Wi-Fi"]
                        elif meal_code == "BB" or meal_code == "CP":
                            plan_modifier = 250 * guests
                            inclusions = ["Breakfast Included", "Free Wi-Fi"]
                        elif meal_code == "HB" or meal_code == "MAP":
                            plan_modifier = 600 * guests
                            inclusions = ["Breakfast + Dinner", "Free Wi-Fi"]
                        elif meal_code == "FB" or meal_code == "AP":
                            plan_modifier = 1000 * guests
                            inclusions = ["All Meals Included", "Free Wi-Fi"]

                        plan_price_nightly = float(rt.base_price) + plan_modifier
                        plan_total = plan_price_nightly * nights
                        
                        # Apply Promo
                        savings_text = None
                        if promo:
                             # Dummy logic for display
                             discount = 0
                             if promo.discount_type == "percentage":
                                 discount = plan_total * (promo.discount_value / 100)
                             else:
                                 discount = promo.discount_value
                             
                             if discount > 0:
                                 savings_text = f"Save INR {int(discount)}"
                                 plan_total -= discount

                        rate_options.append(RateOption(
                            id=plan.id,
                            name=plan.name,
                            meal_plan_code=meal_code,
                            price_per_night=plan_price_nightly,
                            total_price=plan_total,
                            inclusions=inclusions,
                            savings_text=savings_text
                        ))
                
                else:
                    # Logic B: No Rate Plans ? Return Standard
                    # Create default "Standard Rate"
                    rate_options.append(RateOption(
                        id="standard",
                        name="Standard Rate",
                        meal_plan_code="RO",
                        price_per_night=float(rt.base_price),
                        total_price=base_price_total,
                        inclusions=["Room Only"]
                    ))

                    # Create derived CP Rate
                    cp_price = float(rt.base_price) + (300 * guests)
                    rate_options.append(RateOption(
                        id="cp_derived",
                        name="Bed & Breakfast",
                        meal_plan_code="CP",
                        price_per_night=cp_price,
                        total_price=cp_price * nights,
                        inclusions=["Breakfast Included"]
                    ))

                # STARTING PRICE (Lowest)
                lowest_price = min(r.total_price for r in rate_options)
                
                # Use real-time amenities if available, otherwise fall back to JSON
                # This fixes the issue where JSON column is out of sync but also supports legacy data
                real_amenities = room_amenity_map.get(rt.id)
                if not real_amenities:
                     real_amenities = rt.amenities
                
                # Construct response
                # We override amenities from model_dump
                room_dump = rt.model_dump()
                room_dump["amenities"] = real_amenities
                
                room_res = PublicRoomSearchResult(
                    **room_dump,
                    price_starting_at=lowest_price,
                    available_rooms=available,
                    rate_options=rate_options
                )
                available_rooms_list.append(room_res)

    return available_rooms_list


from app.models.addon import AddOn

@router.get("/hotels/{hotel_identifier}/addons", response_model=List[AddOn])
async def get_public_addons(hotel_identifier: str, session: DbSession):
    """
    Get active add-ons for a hotel by slug or ID.
    """
    # Try finding by slug first
    query = select(Hotel).where(Hotel.slug == hotel_identifier)
    result = await session.execute(query)
    hotel = result.scalar_one_or_none()
    
    hotel_id = None
    if hotel:
        hotel_id = hotel.id
    else:
        # If not found by slug, assume it's an ID
        hotel_id = hotel_identifier
        # Optional: Validate if hotel exists by ID to return 404 properly if invalid
        hotel = await session.get(Hotel, hotel_id)
        if not hotel:
            raise HTTPException(status_code=404, detail="Hotel not found")
        
    addon_query = select(AddOn).where(AddOn.hotel_id == hotel_id, AddOn.is_active == True)
    addon_res = await session.execute(addon_query)
    return addon_res.scalars().all()


@router.post("/bookings", response_model=PublicBookingResponse)
async def create_public_booking(
    booking_data: PublicBookingCreate,
    session: DbSession
):
    """
    Create a public booking without authentication.
    Used by the public booking widget/page.
    """
    try:
        # First, we need to find the hotel from the room_type_id
        if not booking_data.rooms:
            raise HTTPException(status_code=400, detail="At least one room is required")
        
        room_type_id = booking_data.rooms[0].room_type_id
        room_type = await session.get(RoomType, room_type_id)
        
        if not room_type:
            raise HTTPException(status_code=404, detail="Room type not found")
        
        hotel_id = room_type.hotel_id
        
        # Check if guest exists by email for this hotel
        guest_data = booking_data.guest
        result = await session.execute(
            select(Guest).where(
                Guest.email == guest_data.email,
                Guest.hotel_id == hotel_id
            )
        )
        guest = result.scalar_one_or_none()
        
        if not guest:
            guest = Guest(
                first_name=guest_data.first_name,
                last_name=guest_data.last_name,
                email=guest_data.email,
                phone=guest_data.phone,
                nationality=guest_data.nationality,
                id_type=guest_data.id_type,
                id_number=guest_data.id_number,
                hotel_id=hotel_id
            )
            session.add(guest)
            await session.flush()
        
        # Calculate total amount
        room_total = sum(room.total_price for room in booking_data.rooms)
        addon_total = sum(addon.price for addon in booking_data.addons)
        total_amount = room_total + addon_total
        
        # Convert rooms/addons to dict format
        rooms_list = [room.model_dump() for room in booking_data.rooms]
        addons_list = [addon.model_dump() for addon in booking_data.addons]
        
        # Create booking
        booking = Booking(
            hotel_id=hotel_id,
            guest_id=guest.id,
            booking_number=generate_booking_number(),
            check_in=booking_data.check_in,
            check_out=booking_data.check_out,
            rooms=rooms_list,
            addons=addons_list,
            special_requests=booking_data.special_requests,
            promo_code=booking_data.promo_code,
            total_amount=total_amount,
            status=BookingStatus.PENDING
        )
        session.add(booking)
        await session.commit()
        await session.refresh(booking)
        
        return PublicBookingResponse(
            id=booking.id,
            booking_number=booking.booking_number,
            status=booking.status.value,
            check_in=booking.check_in,
            check_out=booking.check_out,
            total_amount=booking.total_amount,
            guest={
                "first_name": guest.first_name,
                "last_name": guest.last_name,
                "email": guest.email,
                "phone": guest.phone
            },
            rooms=booking.rooms
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Public booking error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Booking failed: {str(e)}")

