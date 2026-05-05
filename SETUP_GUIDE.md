# PRISM Portal — Complete Setup Guide
## For VS Code · Cursor · Anti Gravity (Google Cloud Workstations)

---

## OPTION A — Easiest: Single HTML File (No Install Required)

This works in ANY browser. No npm, no Python, no Docker needed.

### Steps:
1. Open `PRISM_Standalone_Portal.html` in VS Code
2. Open the file and find this line near the top (line ~18):
   ```
   const ANTHROPIC_API_KEY = 'YOUR_ANTHROPIC_API_KEY_HERE';
   ```
3. Replace with your actual key from https://console.anthropic.com
4. Right-click the file in VS Code Explorer → **Open with Live Server**
   - Or just double-click the HTML file to open in Chrome/Firefox

**That's it.** Full working demo. No server needed.

---

## OPTION B — Full Stack (VS Code / Cursor)

### Prerequisites
Install these tools first:
```
Node.js v18+    → https://nodejs.org (download LTS)
Python 3.11+    → https://python.org (download latest)
Git             → https://git-scm.com
Docker Desktop  → https://www.docker.com/products/docker-desktop
```

### VS Code Extensions to Install (Ctrl+Shift+X):
```
Python (Microsoft)
Pylance
ESLint
Prettier
Live Server
Docker
```

---

### Step-by-Step: First Time Setup

#### 1. Open project folder
```
File → Open Folder → select the prism2/ folder
```

#### 2. Create your .env file
In VS Code terminal (Ctrl+`):
```bash
cp .env.example .env
```
Then open `.env` and fill in:
```
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-5
```
Get your key free at: https://console.anthropic.com

#### 3. Start Docker databases
```bash
docker-compose up -d postgres redis
```
Wait 10 seconds for databases to start.

#### 4. Set up Python backend
In VS Code terminal:
```bash
cd backend
python -m venv .venv
```

**Windows:**
```bash
.venv\Scripts\activate
```
**Mac/Linux:**
```bash
source .venv/bin/activate
```

Install packages:
```bash
pip install -r requirements.txt
```
This takes 3-5 minutes on first run.

#### 5. Set up database tables
```bash
cd ..
python scripts/setup_db.py
```
Expected output:
```
✅ Tables created
✓ admin@prism.ai (admin)
✓ patient@prism.ai (patient)
✅ Database setup complete!
```

#### 6. Set up React frontend
```bash
cd frontend
npm install
cd ..
```
Takes 1-2 minutes.

#### 7. Launch everything
```bash
python run.py
```
Expected output:
```
▶ Starting FastAPI backend on :8000…
▶ Starting Patient UI on :5173…
▶ Starting Admin Portal on :5174…
✅ All services started!
```

#### 8. Open in browser
- **Patient Portal:** http://localhost:5173
- **Admin Portal:** http://localhost:5173/admin
- **API Docs:** http://localhost:8000/docs

---

### VS Code Debug (instead of run.py)

Press **F5** or go to **Run → Start Debugging**

Select from dropdown:
- `PRISM Backend (FastAPI)` — starts the API server
- `PRISM Setup DB` — creates tables

Then separately run frontend:
```bash
cd frontend && npm run dev
```

---

## OPTION C — Google Cloud Workstations (Anti Gravity)

### What is Anti Gravity?
Anti Gravity is Google Cloud Workstations — a browser-based VS Code environment. The setup steps are almost identical to Option B.

### Extra steps for Cloud Workstations:

#### Port forwarding
In the VS Code terminal, click **PORTS** tab at the bottom:
- Add port `8000` (Backend API)
- Add port `5173` (Patient UI)
- Add port `5174` (Admin UI)
- Set visibility to **Public** if you want to share

#### Environment variables (use Secret Manager)
```bash
# Instead of .env file, use Google Secret Manager
gcloud secrets create ANTHROPIC_API_KEY --data-file=-
# Paste your key, then Ctrl+D
```

Or simply edit `.env` directly in the Cloud Workstation editor.

#### Docker in Cloud Workstations
Docker should be pre-installed. If not:
```bash
sudo apt-get install docker.io docker-compose -y
sudo usermod -aG docker $USER
```

---

## WHICH FILES TO UPDATE

If you have the old prism/ folder and want to upgrade to the new agent system:

| File to REPLACE | Location in prism2/ |
|---|---|
| Agent definitions | `backend/config/agent_registry.py` ← **NEW FILE** |
| Agent classes | `backend/core/agents/base_agent.py` ← **NEW FILE** |
| Frontend patient chat | `frontend/src/pages/PatientApp.jsx` |
| Frontend admin | `frontend/src/pages/AdminPortal.jsx` |
| Frontend landing | `frontend/src/pages/Landing.jsx` |
| Backend API routes | `backend/main.py` |

### Files you do NOT need to change:
- `docker-compose.yml`
- `backend/requirements.txt`
- `backend/config/settings.py`
- `backend/database/models.py`
- `backend/middleware/auth.py`
- `backend/core/rag/pipeline.py`
- `run.py`

---

## COMMON ERRORS & FIXES

### Error: "Cannot find module" or "ModuleNotFoundError"
```bash
# Make sure you are in the backend folder with venv active
cd backend
source .venv/bin/activate   # Mac/Linux
# OR
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
```

### Error: "Port 5432 already in use"
```bash
docker-compose down
docker-compose up -d postgres redis
```

### Error: "ANTHROPIC_API_KEY not found"
```bash
# Check your .env file exists
cat .env | grep ANTHROPIC
# Should show: ANTHROPIC_API_KEY=sk-ant-...
```

### Error: "npm: command not found"
- Download and install Node.js from https://nodejs.org
- Restart VS Code after install
- Try again

### Error: Frontend shows blank page
```bash
cd frontend
npm install
npm run dev
```
Make sure you see "ready in XXXms" in the terminal.

### Error: "Cannot connect to database"
```bash
# Check Docker is running
docker ps
# Should show postgres and redis containers
# If not:
docker-compose up -d
```

### Error: "401 Unauthorized" from AI chat
- Your Anthropic API key is invalid or missing
- Open `.env` file and verify `ANTHROPIC_API_KEY=sk-ant-...`
- Get a new key at https://console.anthropic.com

---

## DEMO ACCOUNTS

| Account | Email | Password | Role |
|---|---|---|---|
| Admin | admin@prism.ai | admin123 | Full admin access |
| Patient | patient@prism.ai | demo123 | Premium subscriber |
| Demo | demo@prism.ai | demo123 | Basic subscriber |

---

## QUICK REFERENCE — All URLs

| Service | URL | Purpose |
|---|---|---|
| Patient Portal | http://localhost:5173 | Patient login, subscription, chat |
| Admin Portal | http://localhost:5173/admin | Admin dashboard |
| API Server | http://localhost:8000 | FastAPI backend |
| API Docs | http://localhost:8000/docs | Swagger UI — test all endpoints |
| ChromaDB | http://localhost:8001 | Vector database UI |

---

## ARCHITECTURE SUMMARY

```
Patient Browser                    Admin Browser
      │                                  │
      ▼                                  ▼
React (port 5173) ◄──────────────► React (port 5173/admin)
      │
      ▼
FastAPI (port 8000)
      │
      ├── PostgreSQL (port 5432)  ← User accounts, conversations
      ├── ChromaDB  (port 8001)  ← 25 exclusive vector stores
      ├── Redis     (port 6379)  ← Session cache
      └── Anthropic API          ← LLM for all 25 agents
```
