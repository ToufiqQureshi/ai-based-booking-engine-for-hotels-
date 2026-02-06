import openmeteo_requests
import requests_cache
import pandas as pd
from retry_requests import retry
from langchain_core.tools import tool
from datetime import date

# Open-Meteo Client Setup
cache_session = requests_cache.CachedSession(backend='memory', expire_after=3600)
retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
openmeteo = openmeteo_requests.Client(session=retry_session)

@tool
def get_weather_forecast(city: str) -> str:
    """
    Get weather forecast for a specific city for the next 7 days.
    Useful for predicting demand (e.g., Rain = Low, Sunny = High).
    """
    # Simple Geocoding (Hardcoded for demo, or use Open-Meteo Geocoding API if needed)
    # Ideally, would use a Geocoding library, but let's stick to a robust fallback or simple lookup for now
    # For MVP, we will assume 'Mumbai' or major cities. 
    # LET'S USE OPEN-METEO GEOCODING API (It's free)
    
    try:
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&language=en&format=json"
        geo_res = retry_session.get(geo_url).json()
        
        if not geo_res.get("results"):
            return f"Could not find coordinates for {city}."
            
        lat = geo_res["results"][0]["latitude"]
        lon = geo_res["results"][0]["longitude"]
        
        # Fetch Weather
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": "weather_code,temperature_2m_max,precipitation_sum",
            "timezone": "auto"
        }
        
        responses = openmeteo.weather_api(url, params=params)
        response = responses[0]
        
        daily = response.Daily()
        daily_weather_code = daily.Variables(0).ValuesAsNumpy()
        daily_temp_max = daily.Variables(1).ValuesAsNumpy()
        
        # WMO Weather Codes Interpretation
        def get_weather_desc(code):
            if code <= 3: return "Sunny/Cloudy"
            if code <= 48: return "Foggy"
            if code <= 67: return "Rainy"
            if code <= 77: return "Snowy"
            return "Stormy"

        forecast_summary = f"Weather Forecast for {city}:\n"
        
        # Generate 5-day summary
        start = pd.to_datetime(daily.Time(), unit="s", origin="unix")
        # Just simple loop
        for i in range(5):
             # Note: Proper date handling might be needed depending on openmeteo response format (it returns unix timestamps often)
             # But let's keep it simple string based if possible or index.
             # The SDK returns numpy arrays aligned.
             desc = get_weather_desc(daily_weather_code[i])
             temp = int(daily_temp_max[i])
             forecast_summary += f"- Day {i+1}: {desc}, Max {temp}°C\n"
             
        return forecast_summary
        
    except Exception as e:
        return f"Weather fetch failed: {str(e)}"
