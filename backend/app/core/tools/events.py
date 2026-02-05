from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.tools import tool

@tool
def get_local_events(city: str) -> str:
    """
    Search for upcoming events, concerts, or festivals in a city to predict demand.
    """
    search = DuckDuckGoSearchRun()
    query = f"upcoming big events concerts festivals in {city} next month"
    try:
        results = search.run(query)
        if not results:
            return f"No major events found in {city} for the next month."
        return f"Event Search Results for {city}:\n{results}\n(Analyze these to see if they drive hotel demand)."
    except Exception as e:
        return f"Event search failed: {str(e)}"
