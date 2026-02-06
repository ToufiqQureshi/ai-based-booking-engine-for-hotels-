from langchain_core.tools import tool
from sqlmodel import select, Session
from app.models.room import RoomType
from app.models.promo import PromoCode
from app.core.database import engine
from sqlalchemy.orm import sessionmaker

# Create a sync session factory for tools if needed, 
# but better to pass the async session from the agent.
# However, for simplicity in tool definition, we can use the passed session approach 
# or rely on the agent graph state. 
# BUT `agent.py` passes the session globally to the tool constructor wrapper or bind?
# Actually `agent.py` defines tools inside `create_agent_executor` scope, capable of using `session`.
# So we should define these as "factories" or stick to the `agent.py` closure pattern.

# Let's define them here as standalone functions that take a session, 
# and in `agent.py` we will wrap them or simply define them inside `create_agent_executor` 
# similar to existing tools to access `session` and `user`.

# WAIT! usage of `session` inside `agent.py` tools is via closure.
# To keep `agent.py` clean, I will define the logic here and import it, 
# but the @tool decorator needs to be applied where the session is available OR 
# we use a class-based tool. 

# Simplest approach for now: Define logic functions here, and wrap them in @tool in `agent.py`.

async def logic_update_room_price(session, user, room_name: str, new_price: float) -> str:
    """Updates the base price of a room type."""
    query = select(RoomType).where(
        RoomType.hotel_id == user.hotel_id,
        RoomType.name.ilike(f"%{room_name}%")
    )
    result = await session.execute(query)
    room = result.scalars().first()
    
    if not room:
        return f"Room '{room_name}' not found."
    
    old_price = room.base_price
    room.base_price = new_price
    session.add(room)
    await session.commit()
    await session.refresh(room)
    
    return f"SUCCESS: Updated {room.name} price from {old_price} to {new_price}."

async def logic_create_promo_code(session, user, code: str, discount_percent: int) -> str:
    """Creates a new promo code."""
    # Check if exists
    query = select(PromoCode).where(
        PromoCode.hotel_id == user.hotel_id,
        PromoCode.code == code
    )
    result = await session.execute(query)
    existing = result.scalars().first()
    
    if existing:
        return f"Promo code '{code}' already exists."
    
    new_promo = PromoCode(
        hotel_id=user.hotel_id,
        code=code.upper(),
        discount_value=discount_percent,
        is_active=True
    )
    session.add(new_promo)
    await session.commit()
    
    return f"SUCCESS: Created promo code '{code}' with {discount_percent}% discount."
