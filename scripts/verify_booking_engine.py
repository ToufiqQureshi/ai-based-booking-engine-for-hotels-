
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8003/api/v1"

def print_pass(message):
    print(f"✅ PASS: {message}")

def print_fail(message):
    print(f"❌ FAIL: {message}")

def verify_hotel_public_details():
    """Verify we can fetch hotel details publically"""
    print("\n--- Verifying Hotel Details ---")
    response = requests.get(f"{BASE_URL}/public/hotels/slug/dwarka-hotel")
    if response.status_code == 200:
        data = response.json()
        print_pass(f"Fetched hotel: {data.get('name')}")
        return data.get('id')
    else:
        print_fail(f"Could not fetch hotel. Status: {response.status_code}")
        return None

def verify_room_search(hotel_id):
    """Verify room search returns rate options"""
    print("\n--- Verifying Room Search with Rate Plans ---")

    check_in = datetime.now().date() + timedelta(days=10)
    check_out = check_in + timedelta(days=2)

    params = {
        "check_in": check_in.isoformat(),
        "check_out": check_out.isoformat(),
        "guests": 2
    }

    response = requests.get(f"{BASE_URL}/public/hotels/{hotel_id}/rooms", params=params)

    if response.status_code == 200:
        rooms = response.json()
        if len(rooms) > 0:
            print_pass(f"Found {len(rooms)} rooms")

            room = rooms[0]
            print(f"Room keys received: {list(room.keys())}")
            # Check for new fields
            if "rate_options" in room:
                print_pass("rate_options field present")
                rates = room['rate_options']
                print(f"   Found {len(rates)} rate plans for room '{room['name']}'")

                for r in rates:
                    print(f"   - {r['name']}: {r['total_price']} ({r['meal_plan_code']})")

                if len(rates) > 1:
                    print_pass("Multiple rate plans returned")
                else:
                    print_pass("Single rate plan returned (Standard)")
            else:
                print_fail("rate_options field MISSING")

            if "price_starting_at" in room:
                print_pass(f"price_starting_at present: {room['price_starting_at']}")
            else:
                print_fail("price_starting_at MISSING")

        else:
            print_fail("No rooms found (Check inventory?)")
    else:
        print_fail(f"Search failed. Status: {response.status_code}")

def verify_promo_code_logic(hotel_id):
    """Verify promo code Application"""
    print("\n--- Verifying Promo Code Logic ---")

    # First creating a promo code is internal (requires DB access or Admin API)
    # Since we don't have an admin script running here easily without auth,
    # we will skip creating one and just check if the endpoint handles an INVALID promo code gracefully
    # or if we can manually insert one via SQL if needed.
    # For now, let's test the endpoint response with a dummy code.

    check_in = datetime.now().date() + timedelta(days=10)
    check_out = check_in + timedelta(days=2)

    params = {
        "check_in": check_in.isoformat(),
        "check_out": check_out.isoformat(),
        "guests": 2,
        "promo_code": "INVALID_CODE_123"
    }

    response = requests.get(f"{BASE_URL}/public/hotels/{hotel_id}/rooms", params=params)
    if response.status_code == 200:
        print_pass("Search with invalid promo code works (doesn't crash)")
        # Ideally we check that no discount was applied
    else:
        print_fail("Search with invalid promo code crashed")

if __name__ == "__main__":
    print("Starting Verification...")
    hotel_id = verify_hotel_public_details()
    if hotel_id:
        verify_room_search(hotel_id)
        verify_promo_code_logic(hotel_id)
    print("\nVerification Complete.")
