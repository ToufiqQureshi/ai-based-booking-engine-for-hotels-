import requests
import datetime

today = datetime.date.today()
tomorrow = today + datetime.timedelta(days=1)

url = f"http://localhost:8001/api/v1/public/rooms/toufiqqureshi651gmailcom?check_in={today}&check_out={tomorrow}&guests=1"

try:
    print(f"Requesting: {url}")
    res = requests.get(url)
    print(f"Status: {res.status_code}")
    data = res.json()
    print(f"Found {len(data)} rooms")
    if len(data) > 0:
        print(f"First room: {data[0].get('name')}")
        print(f"Rates: {data[0].get('rate_options')}")
    else:
        print("Response data is empty list.")
except Exception as e:
    print(f"Error: {e}")
