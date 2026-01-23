import asyncio
import httpx
import sys

# Configuration
BASE_URL = "http://127.0.0.1:8003/api/v1"
EMAIL = "toufiqqureshi651@gmail.com"
PASSWORD = "jh4DjipztxTMw4S"

async def verify_backend():
    print("🚀 Starting Backend System Verification...\n")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Authentication
        print("1️⃣  Testing Authentication...")
        try:
            resp = await client.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
            if resp.status_code == 200:
                token = resp.json()["access_token"]
                headers = {"Authorization": f"Bearer {token}"}
                print("   ✅ Login Successful")
            else:
                print(f"   ❌ Login Failed: {resp.status_code} - {resp.text}")
                return
        except Exception as e:
            print(f"   ❌ Auth Error: {e}")
            return

        # 2. Core Resources
        endpoints = [
            ("Rooms", "/rooms"),
            ("Room Types", "/rooms/types"),
            ("Bookings", "/bookings"),
            ("Guests", "/guests"),
            ("Payments", "/payments"),
            ("Amenities", "/amenities"),
            ("Channel Manager", "/channel-manager/settings")
        ]

        print("\n2️⃣  Testing Core Resources...")
        for name, path in endpoints:
            try:
                r = await client.get(f"{BASE_URL}{path}", headers=headers)
                if r.status_code == 200:
                    count = len(r.json()) if isinstance(r.json(), list) else "OK"
                    print(f"   ✅ {name}: Working (Status 200, Items: {count})")
                else:
                    print(f"   ❌ {name}: Failed (Status {r.status_code})")
            except Exception as e:
                print(f"   ❌ {name}: Error ({e})")

        # 3. Availability Check
        print("\n3️⃣  Testing Availability Engine...")
        try:
            # Need a room type ID first
            rooms_resp = await client.get(f"{BASE_URL}/rooms", headers=headers)
            if rooms_resp.json():
                room_type_id = rooms_resp.json()[0]["id"]
                # Check availability for next month
                params = {
                    "room_type_id": room_type_id,
                    "start_date": "2026-06-01",
                    "end_date": "2026-06-10"
                }
                av_resp = await client.get(f"{BASE_URL}/availability", headers=headers, params=params)
                if av_resp.status_code == 200:
                     print(f"   ✅ Availability Engine: Working (Calculated for {room_type_id})")
                else:
                     print(f"   ❌ Availability Engine: Failed ({av_resp.status_code})")
            else:
                print("   ⚠️  Skipping Availability (No rooms found to test)")
        except Exception as e:
            print(f"   ❌ Availability Error: {e}")

    print("\n🏁 Backend Verification Complete.")

if __name__ == "__main__":
    asyncio.run(verify_backend())
