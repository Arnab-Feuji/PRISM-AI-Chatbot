# PRISM — Patient-centric Retrieval Intelligence System for Medicine
**Version 2.0 | Feuji AI/ML Data Science Team**

## Architecture Overview

```
PRISM/
├── backend/          FastAPI + LangGraph backend
├── frontend/         React + Vite patient & admin UI
├── scripts/          Setup, crawl, seed utilities
├── data/             ChromaDB + uploads (gitignored)
├── docker-compose.yml
├── .env.example
└── run.py            Single entry-point launcher
```

## Quick Start (VS Code / Cursor)

### 1. Prerequisites
```bash
node >= 18, python >= 3.11, docker, git
```

### 2. Clone & configure
```bash
git clone <repo>
cd prism
cp .env.example .env
# Edit .env — add your API keys
```

### 3. Start services (PostgreSQL + Redis)
```bash
docker-compose up -d postgres redis
```

### 4. Backend setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python ../scripts/setup_db.py      # Creates all tables
python ../scripts/seed_agents.py   # Seeds 25 agent configs
cd ..
```

### 5. Frontend setup
```bash
cd frontend
npm install
cd ..
```

### 6. Launch everything
```bash
python run.py
# Backend:  http://localhost:8000
# Patient:  http://localhost:5173
# Admin:    http://localhost:5174
# API docs: http://localhost:8000/docs
```

## Disease Domains & Agents

| Domain | Agents |
|--------|--------|
| 🎗 Cancer Care | CA1 Screening · CA2 Treatment · CA3 Supportive · CA4 Survivorship · CA5 Hereditary |
| 🩺 Diabetes | DM1 Monitoring · DM2 Medication · DM3 Nutrition · DM4 Complications · DM5 Gestational |
| ❤ Cardiovascular | CV1 Clinical · CV2 Emergency · CV3 Medications · CV4 Rehab · CV5 Nutrition |
| 🧠 Mental Health | MH1 Depression · MH2 Anxiety · MH3 Sleep · MH4 Trauma · MH5 Crisis |
| 🫁 Respiratory | RS1 Asthma · RS2 COPD · RS3 Therapy · RS4 Medications · RS5 Sleep |

Each agent has:
- **Primary agent** (temperature 0.2)
- **Specialist sub-agent** (confidence < 0.70 → escalates)
- **Human escalation** (frustration score > 75 → coordinator)

## Features
- LangGraph multi-agent orchestration (25 agents)
- Pre-RAG 19-dimension readiness gate (Tier 1 + Tier 2)
- RAG pipeline: chunking → embedding → reranking → retrieval
- 15 mutually exclusive ChromaDB vector stores (one per agent group)
- PubMed + CDC crawlers
- Multimodal: prescription image OCR + audio Whisper
- Multilingual: EN / HI / TE / ES / PA
- RAGAS metrics (faithfulness, relevance, context recall, precision, answer similarity)
- Responsible AI metrics
- Subscription tiers: Free / Basic / Premium / Enterprise
- JWT authentication
- PostgreSQL chat history
- React patient UI + React admin portal
