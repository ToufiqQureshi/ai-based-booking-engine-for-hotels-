
import requests
import json
from datetime import date, timedelta

BASE_URL = "http://127.0.0.1:8003/api/v1"
HOTEL_SLUG = "dwarka-hotel"

def test_get_addons():
    print(f"Fetching addons for {HOTEL_SLUG}...")
    url = f"{BASE_URL}/public/hotels/slug/{HOTEL_SLUG}/addons"
    response = requests.get(url)
    
    if response.status_code == 200:
        addons = response.json()
        print(f"✅ Success! Found {len(addons)} addons.")
        for addon in addons:
            print(f" - {addon['name']}: {addon['price']}")
        return addons
    else:
        print(f"❌ Failed to fetch addons: {response.status_code} {response.text}")
        return []

def test_create_booking_with_addons(addons):
    if not addons:
        print("Skipping booking test due to no addons.")
        return

    print("\nCreating booking with addons...")
    
    # 1. Search for a room to get a valid room_type_id
    check_in = date.today() + timedelta(days=10)
    check_out = check_in + timedelta(days=2)
    
    search_url = f"{BASE_URL}/public/hotels/{HOTEL_SLUG}/rooms"
    params = {
        "check_in": check_in.isoformat(),
        "check_out": check_out.isoformat(),
        "guests": 2
    }
    
    search_res = requests.get(search_url, params=params)
    print(f"Search Status: {search_res.status_code}")
    print(f"Search URL: {search_res.url}")
    
    if search_res.status_code != 200:
        print(f"❌ Failed to search rooms: {search_res.text}")
        return

    rooms = search_res.json()
    print(f"Rooms found: {len(rooms)}")
    if not rooms:
        print("❌ No rooms found.")
        print(f"Response text: {search_res.text}")
        return
        
    room = rooms[0]
    rate_option = room['rate_options'][0]
    
    # Select first addon
    selected_addon = addons[0]
    
    payload = {
        "check_in": check_in.isoformat(),
        "check_out": check_out.isoformat(),
        "guest": {
            "first_name": "Test",
            "last_name": "AddonUser",
            "email": "test.addon@example.com",
            "phone": "1234567890",
            "nationality": "IN",
            "id_type": "passport",
            "id_number": "TEST1234"
        },
        "rooms": [
            {
                "room_type_id": room['id'],
                "room_type_name": room['name'],
                "price_per_night": rate_option['price_per_night'],
                "total_price": rate_option['total_price'],
                "guests": 2,
                "rate_plan_id": rate_option['id'],
                "rate_plan_name": rate_option['name']
            }
        ],
        "addons": [
            {
                "id": selected_addon['id'],
                "name": selected_addon['name'],
                "price": selected_addon['price']
            }
        ],
        "special_requests": "Testing addons"
    }
    
    booking_url = f"{BASE_URL}/public/bookings"
    booking_res = requests.post(booking_url, json=payload)
    
    if booking_res.status_code == 200:
        booking = booking_res.json()
        print(f"✅ Booking created successfully! ID: {booking['id']}")
        print(f"   Total Amount: {booking['total_amount']}")
        
        expected_total = rate_option['total_price'] + selected_addon['price']
        if abs(booking['total_amount'] - expected_total) < 1.0:
             print(f"✅ Price calculation correct: {booking['total_amount']} == {expected_total}")
        else:
             print(f"❌ Price mismatch! Expected {expected_total}, got {booking['total_amount']}")

    else:
        print(f"❌ Booking failed: {booking_res.status_code} {booking_res.text}")

if __name__ == "__main__":
    addons = test_get_addons()
    test_create_booking_with_addons(addons)
