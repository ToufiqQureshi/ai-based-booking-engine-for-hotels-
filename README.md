# Hotelier Hub - Monorepo Structure

## 📁 Project Structure

```
hotelier-hub/
├── 📁 frontend/              # React/TypeScript Web Application
│   ├── src/                  # Source code
│   ├── public/               # Static assets
│   ├── package.json          # Dependencies
│   ├── vite.config.ts        # Vite configuration
│   └── .env                  # Environment variables
│
├── 📁 backend/               # FastAPI Python API
│   ├── app/                  # Application code
│   ├── venv/                 # Python virtual environment
│   ├── main.py               # Entry point
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # Environment variables
│
├── 📁 chrome_extension/      # Browser Extension for Rate Scraping
│   ├── background.js         # Service worker
│   ├── content.js            # Page injector
│   ├── scraper.js            # DOM scraper
│   └── manifest.json         # Extension config
│
├── 📁 scripts/               # Utility Scripts
│   ├── create_superuser.py
│   └── seed_*.py
│
├── cloudflared_config.yml    # Cloudflare Tunnel config
├── run_server.py             # Production server launcher
└── README.md                 # This file
```

## 🚀 Running the Project

### Frontend (React/Vite)
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:8080
```

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8001
# API docs: http://127.0.0.1:8001/docs
```

### Cloudflare Tunnel (Public Access)
```bash
# From project root
cloudflared tunnel --config cloudflared_config.yml run
# Frontend: app.gadget4me.in
# Backend: api.gadget4me.in
```

### Chrome Extension (Rate Scraping)
1. Open Chrome: `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `chrome_extension` folder

## 🔧 Development Commands

**Frontend:**
- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Backend:**
- `uvicorn main:app --reload` - Dev mode with hot reload
- `python run_server.py` - Production mode

## 📦 Technologies

**Frontend:**
- React 18
- TypeScript
- Vite
- TailwindCSS
- shadcn/ui

**Backend:**
- FastAPI
- PostgreSQL
- SQLModel
- Pydantic

**Extension:**
- Chrome Extension Manifest V3
- Vanilla JavaScript

## 🌐 Environment Variables

### Frontend (.env)
```
VITE_API_URL=/api/v1
```

### Backend (.env)
```
DATABASE_URL=postgresql://...
SECRET_KEY=your-secret-key
DEBUG=True
```

## 📝 Notes

- Frontend runs on port **8080**
- Backend runs on port **8001**
- Cloudflare Tunnel routes public domains to local services
- Extension scrapes competitor rates client-side (no server load)
