"""
Availability Router
Real-time room inventory calculation and blocking management.
"""
from typing import List, Dict, Any
from datetime import date, timedelta, datetime
from fastapi import APIRouter, Query, Depends, HTTPException, status
from sqlmodel import select, and_, or_

from app.api.deps import CurrentUser, DbSession
from app.models.room import RoomType, RoomBlock, RoomBlockCreate, RoomBlockRead
from app.models.booking import Booking, BookingStatus

router = APIRouter(prefix="/availability", tags=["Availability"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_availability(
    current_user: CurrentUser,
    session: DbSession,
    start_date: date = Query(...),
    end_date: date = Query(...)
):
    """
    Calculate daily availability for all room types.
    Returns: List of room types with their daily availability.
    """
    # 1. Get all room types
    room_types_result = await session.execute(
        select(RoomType).where(RoomType.hotel_id == current_user.hotel_id)
    )
    room_types = room_types_result.scalars().all()
    
    # 2. Get overlapping bookings
    bookings_result = await session.execute(
        select(Booking).where(
            Booking.hotel_id == current_user.hotel_id,
            Booking.status != BookingStatus.CANCELLED,
            or_(
                and_(Booking.check_in <= end_date, Booking.check_out > start_date)
            )
        )
    )
    bookings = bookings_result.scalars().all()

    # 3. Get overlapping blocks
    blocks_result = await session.execute(
        select(RoomBlock).where(
            RoomBlock.hotel_id == current_user.hotel_id,
            or_(
                and_(RoomBlock.start_date <= end_date, RoomBlock.end_date >= start_date)
            )
        )
    )
    blocks = blocks_result.scalars().all()
    
    # 4. Generate date range
    delta = (end_date - start_date).days
    date_range = [start_date + timedelta(days=i) for i in range(delta + 1)]
    
    # 5. Calculate availability
    availability_data = []
    
    for room in room_types:
        room_data = {
            "id": room.id,
            "name": room.name,
            "totalInventory": room.total_inventory,
            "availability": []
        }
        
        for day in date_range:
            # Count booked rooms
            booked_count = 0
            for booking in bookings:
                if booking.check_in <= day < booking.check_out:
                    for booked_room in booking.rooms:
                        if booked_room.get("room_type_id") == room.id:
                            booked_count += 1
            
            # Count blocked rooms
            blocked_count = 0
            for block in blocks:
                # Blocks are inclusive of start and end date usually, or match logic
                # RoomBlock: start_date, end_date. Assuming inclusive.
                if block.room_type_id == room.id and block.start_date <= day <= block.end_date:
                    blocked_count += block.blocked_count

            available = max(0, room.total_inventory - booked_count - blocked_count)
            is_blocked = blocked_count >= room.total_inventory # Fully blocked by blocks
            
            room_data["availability"].append({
                "date": day.isoformat(),
                "totalRooms": room.total_inventory,
                "bookedRooms": booked_count,
                "blockedRooms": blocked_count,
                "availableRooms": available,
                "isBlocked": is_blocked or available == 0,
            })
            
        availability_data.append(room_data)
        
    return availability_data


@router.get("/blocks", response_model=List[RoomBlockRead])
async def get_blocks(
    current_user: CurrentUser,
    session: DbSession,
    room_type_id: str = Query(...),
    start_date: date = Query(...),
    end_date: date = Query(...)
):
    """Get blocks for a specific room and date range"""
    result = await session.execute(
        select(RoomBlock).where(
            RoomBlock.hotel_id == current_user.hotel_id,
            RoomBlock.room_type_id == room_type_id,
            RoomBlock.end_date >= start_date,
            RoomBlock.start_date <= end_date
        )
    )
    return result.scalars().all()


@router.post("/blocks", response_model=RoomBlockRead)
async def create_block(
    block_data: RoomBlockCreate,
    current_user: CurrentUser,
    session: DbSession
):
    """Block rooms for a date range"""
    block = RoomBlock(
        **block_data.model_dump(),
        hotel_id=current_user.hotel_id
    )
    session.add(block)
    await session.commit()
    await session.refresh(block)
    return block


@router.delete("/blocks/{block_id}")
async def delete_block(
    block_id: str,
    current_user: CurrentUser,
    session: DbSession
):
    """Remove a room block"""
    print(f"DEBUG: Attempting to delete block {block_id} for hotel {current_user.hotel_id}")
    result = await session.execute(
        select(RoomBlock).where(
            RoomBlock.id == block_id,
            RoomBlock.hotel_id == current_user.hotel_id
        )
    )
    block = result.scalar_one_or_none()
    
    if not block:
        print(f"DEBUG: Block {block_id} NOT FOUND")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block not found"
        )
        
    try:
        # Delete the block
        await session.delete(block)
        await session.flush()
        await session.commit()
            
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    return {"message": "Block deleted successfully"}
