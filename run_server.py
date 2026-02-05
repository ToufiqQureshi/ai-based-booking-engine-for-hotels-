import sys, os
from dotenv import load_dotenv

# Ensure backend package is on sys.path
backend_path = os.path.join(os.path.dirname(__file__), "backend")
if backend_path not in sys.path:
    sys.path.append(backend_path)

# Load environment variables from backend/.env
load_dotenv(os.path.join(backend_path, ".env"))

from backend.main import app
import uvicorn

if __name__ == "__main__":
    # Production settings: reload=False, workers could be increased via command line or env if using gunicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8001, reload=False)
