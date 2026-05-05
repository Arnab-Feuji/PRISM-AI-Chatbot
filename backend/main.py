"""
PRISM — FastAPI Main Application
All routes: auth, chat, ingest, admin, crawl, feedback, multimodal
"""
import os, uuid, time
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr

from config.settings import get_settings
from config.disease_config import AGENTS, DISEASE_DOMAINS, SUBSCRIPTION_TIERS, PRIMARY_AGENTS
from database.models import (
    create_tables, get_db, User, Conversation, Message,
    PatientFeedback, IndexedDocument, LLMCallLog, RAGASMetric,
    SystemAlert, PreRAGResult,
)
from middleware.auth import (
    hash_password, verify_password, create_token,
    get_current_user, require_admin,
)
from core.agents.orchestrator import get_orchestrator
from core.rag.pipeline import get_rag_pipeline
from core.multimodal.processor import PRISMMultimodalProcessor
from core.crawlers.pubmed_crawler import PubMedCrawler, CDCCrawler
from core.quality.response_quality import ResponseQualityScorer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

settings = get_settings()

app = FastAPI(
    title="PRISM API",
    description="Patient-centric Retrieval Intelligence System for Medicine",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

multimodal_proc = PRISMMultimodalProcessor()
quality_scorer  = ResponseQualityScorer()


@app.on_event("startup")
async def startup():
    await create_tables()
    os.makedirs(settings.upload_dir, exist_ok=True)


# ═══════════════════════════════════════════════════════════════════════════
# HEALTH
# ═══════════════════════════════════════════════════════════════════════════
@app.get("/")
async def health():
    return {"status": "ok", "version": "2.0", "diseases": list(DISEASE_DOMAINS.keys())}

@app.get("/api/health")
async def api_health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat(), "agents": len(AGENTS)}


# ═══════════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════════
class RegisterRequest(BaseModel):
    email: str
    name:  str
    password: str
    language: str = "en"

class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/api/auth/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")
    user = User(
        id=str(uuid.uuid4()), email=req.email, name=req.name,
        hashed_password=hash_password(req.password), language=req.language,
    )
    db.add(user)
    await db.flush()
    token = create_token({"sub": user.id, "email": user.email, "role": user.role, "subscription": user.subscription})
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role, "subscription": user.subscription}}


@app.post("/api/auth/token")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == req.email))
    user = res.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    user.last_login = datetime.utcnow()
    token = create_token({"sub": user.id, "email": user.email, "role": user.role, "subscription": user.subscription})
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role, "subscription": user.subscription, "subscribed_diseases": user.subscribed_diseases, "language": user.language}}


@app.get("/api/auth/me")
async def me(current: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.id == current["user_id"]))
    user = res.scalar_one_or_none()
    if not user: raise HTTPException(404, "User not found")
    return {"id": user.id, "email": user.email, "name": user.name, "role": user.role,
            "subscription": user.subscription, "subscribed_diseases": user.subscribed_diseases,
            "language": user.language}


# ═══════════════════════════════════════════════════════════════════════════
# DISEASES & AGENTS
# ═══════════════════════════════════════════════════════════════════════════
@app.get("/api/diseases")
async def get_diseases():
    return [{"code": k, **v} for k, v in DISEASE_DOMAINS.items()]

@app.get("/api/diseases/{code}")
async def get_disease(code: str):
    d = DISEASE_DOMAINS.get(code.upper())
    if not d: raise HTTPException(404, "Disease not found")
    agents_info = []
    for aid in d["agents"]:
        a = AGENTS.get(aid)
        if a:
            agents_info.append({"agent_id": a.agent_id, "name": a.name, "icon": a.icon,
                                 "color": a.color, "top5_questions": a.top5_questions})
    return {**d, "code": code.upper(), "agents": agents_info}

@app.get("/api/agents/{agent_id}/questions")
async def get_agent_questions(agent_id: str):
    a = AGENTS.get(agent_id.upper())
    if not a: raise HTTPException(404, "Agent not found")
    return {"agent_id": a.agent_id, "name": a.name, "questions": a.top5_questions}


# ═══════════════════════════════════════════════════════════════════════════
# SUBSCRIPTION
# ═══════════════════════════════════════════════════════════════════════════
class SubscribeRequest(BaseModel):
    tier: str
    disease_codes: List[str]

@app.post("/api/subscribe")
async def subscribe(req: SubscribeRequest, current: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tier = SUBSCRIPTION_TIERS.get(req.tier)
    if not tier: raise HTTPException(400, "Invalid tier")
    res = await db.execute(select(User).where(User.id == current["user_id"]))
    user = res.scalar_one_or_none()
    if not user: raise HTTPException(404, "User not found")
    max_d = tier["diseases"]
    diseases = req.disease_codes[:max_d]
    user.subscription = req.tier
    user.subscribed_diseases = diseases
    return {"subscription": req.tier, "subscribed_diseases": diseases}


# ═══════════════════════════════════════════════════════════════════════════
# CONVERSATIONS
# ═══════════════════════════════════════════════════════════════════════════
@app.get("/api/conversations")
async def list_conversations(current: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Conversation).where(Conversation.user_id == current["user_id"])
        .order_by(desc(Conversation.updated_at)).limit(50)
    )
    convs = res.scalars().all()
    return [{"id": c.id, "title": c.title, "disease_code": c.disease_code,
             "agent_id": c.agent_id, "updated_at": c.updated_at.isoformat(),
             "total_messages": c.total_messages} for c in convs]

@app.get("/api/conversations/{conv_id}/messages")
async def get_messages(conv_id: str, current: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Conversation).where(
        Conversation.id == conv_id, Conversation.user_id == current["user_id"]))
    conv = res.scalar_one_or_none()
    if not conv: raise HTTPException(404, "Conversation not found")
    msg_res = await db.execute(select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at))
    msgs = msg_res.scalars().all()
    return [{"id": m.id, "role": m.role, "content": m.content,
             "agent_id": m.agent_id, "confidence": m.confidence,
             "citations": m.citations, "created_at": m.created_at.isoformat()} for m in msgs]


# ═══════════════════════════════════════════════════════════════════════════
# CHAT
# ═══════════════════════════════════════════════════════════════════════════
class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    agent_id:        str
    message:         str
    language:        str = "en"

@app.post("/api/chat")
async def chat(req: ChatRequest, current: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        t0 = time.time()
        user_id = current["user_id"]

        # Get or create conversation
        conv_id = req.conversation_id
        if conv_id:
            conv_res = await db.execute(select(Conversation).where(Conversation.id == conv_id))
            conv = conv_res.scalar_one_or_none()
        else:
            conv = None

        if not conv:
            agent = AGENTS.get(req.agent_id.upper())
            conv = Conversation(
                id=str(uuid.uuid4()), user_id=user_id,
                disease_code=agent.disease_code if agent else "XX",
                agent_id=req.agent_id.upper(),
                title=req.message[:60],
                language=req.language,
            )
            db.add(conv)
            await db.flush()
            conv_id = conv.id

        # Load history
        hist_res = await db.execute(
            select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at).limit(20))
        history = [{"role": str(m.role), "content": m.content} for m in hist_res.scalars().all()]

        # Run orchestrator
        orchestrator = get_orchestrator()
        result = await orchestrator.chat(
            user_id=user_id, conversation_id=conv_id,
            agent_id=req.agent_id.upper(), message=req.message,
            language=req.language, history=history,
        )

        # Save messages
        user_msg = Message(
            id=str(uuid.uuid4()), conversation_id=conv_id,
            role="user", content=req.message, original_language=req.language,
            agent_id=req.agent_id.upper(), processing_ms=0,
        )
        db.add(user_msg)

        ai_msg = Message(
            id=str(uuid.uuid4()), conversation_id=conv_id,
            role="assistant", content=result["response"],
            agent_id=result.get("escalated_to") or req.agent_id.upper(),
            confidence=result["confidence"],
            frustration=result["frustration"],
            citations=result["citations"],
            retrieved_chunks=[{"text": c["text"][:200], "score": float(c.get("score", 0))} for c in result["retrieved_chunks"][:3]],
            ragas_scores=result["ragas_scores"],
            processing_ms=int((time.time() - t0) * 1000),
        )
        db.add(ai_msg)

        # Update conversation
        conv.total_messages += 2
        conv.updated_at = datetime.utcnow()

        # Log RAGAS
        ragas = result.get("ragas_scores", {})
        db.add(RAGASMetric(
            id=str(uuid.uuid4()), message_id=ai_msg.id, conversation_id=conv_id,
            agent_id=req.agent_id.upper(),
            disease_code=conv.disease_code,
            faithfulness=ragas.get("faithfulness", 0),
            answer_relevancy=ragas.get("answer_relevancy", 0),
            context_recall=ragas.get("context_recall", 0),
            context_precision=ragas.get("context_precision", 0),
            answer_similarity=ragas.get("answer_similarity", 0),
            overall_score=ragas.get("overall", 0),
        ))

        return {
            "conversation_id":  conv_id,
            "message_id":        ai_msg.id,
            "response":          result["response"],
            "agent_id":          req.agent_id.upper(),
            "escalated_to":      result.get("escalated_to", "none"),
            "confidence":        result["confidence"],
            "frustration":       result["frustration"],
            "citations":         result["citations"],
            "ragas_scores":      result["ragas_scores"],
            "detected_lang":     result.get("detected_lang", req.language),
            "processing_steps":  result.get("processing_steps", []),
            "latency_ms":        int((time.time() - t0) * 1000),
        }
    except Exception as e:
        import traceback
        log_path = os.path.join(os.path.dirname(__file__), "backend_error.log")
        with open(log_path, "a") as f:
            f.write(f"\n\nERROR at {datetime.now().isoformat()}:\n")
            traceback.print_exc(file=f)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════
# MULTIMODAL CHAT
# ═══════════════════════════════════════════════════════════════════════════
@app.post("/api/chat/multimodal")
async def chat_multimodal(
    agent_id:        str = Form(...),
    conversation_id: Optional[str] = Form(None),
    language:        str = Form("en"),
    text_message:    str = Form(""),
    file:            UploadFile = File(...),
    current: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    result = multimodal_proc.process(content, file.content_type, language)

    # Combine extracted text with user message
    combined = f"{text_message}\n\n[Extracted from {result.get('doc_type','file')}]:\n{result.get('text','')}"

    # Now run regular chat
    req = ChatRequest(conversation_id=conversation_id, agent_id=agent_id,
                      message=combined.strip(), language=language)
    return await chat(req, current, db)


# ═══════════════════════════════════════════════════════════════════════════
# DOCUMENT INGEST
# ═══════════════════════════════════════════════════════════════════════════
@app.post("/api/ingest")
async def ingest_document(
    agent_id:       str = Form(...),
    source:         str = Form(""),
    year:           Optional[int] = Form(None),
    evidence_grade: str = Form(""),
    file:           UploadFile = File(...),
    current: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    agent = AGENTS.get(agent_id.upper())
    if not agent: raise HTTPException(404, "Agent not found")

    content = await file.read()
    filename = file.filename or "upload"

    # Extract text
    if filename.endswith(".pdf"):
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(content))
        text = "\n".join(p.extract_text() or "" for p in reader.pages)
    else:
        try: text = content.decode("utf-8")
        except: text = content.decode("latin-1", errors="ignore")

    if len(text.strip()) < 100:
        raise HTTPException(400, "Document too short or unreadable")

    meta = {"source": source or filename, "year": year, "evidence_grade": evidence_grade,
            "agent_scope": agent_id, "doc_type": "upload", "source_url": ""}

    pipeline = get_rag_pipeline()
    result = pipeline.ingest(text, meta, agent.collection_name)

    doc = IndexedDocument(
        id=str(uuid.uuid4()), title=filename, source=source or filename,
        collection_name=agent.collection_name, agent_id=agent_id.upper(),
        disease_code=agent.disease_code, doc_type="upload",
        evidence_grade=evidence_grade or None,
        publication_year=year, chunk_count=result["chunks_created"],
        token_count=int(len(text.split()) * 1.3),
    )
    db.add(doc)

    return {"status": "ingested", "document_id": doc.id, **result}


# ═══════════════════════════════════════════════════════════════════════════
# CRAWL
# ═══════════════════════════════════════════════════════════════════════════
class CrawlRequest(BaseModel):
    agent_id:    str
    query:       str
    max_results: int = 10
    source:      str = "pubmed"  # pubmed | cdc

@app.post("/api/admin/crawl")
async def crawl(req: CrawlRequest, bg: BackgroundTasks,
                current: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    agent = AGENTS.get(req.agent_id.upper())
    if not agent: raise HTTPException(404, "Agent not found")

    async def _do_crawl():
        pipeline = get_rag_pipeline()
        if req.source == "pubmed":
            crawler = PubMedCrawler()
            docs = crawler.search(req.query, req.max_results)
        else:
            crawler = CDCCrawler()
            docs = crawler.crawl(agent.disease_code)
        for doc in docs:
            text = doc.get("abstract") or doc.get("text", "")
            if len(text) < 100: continue
            meta = {"source": doc.get("source",""), "year": doc.get("year"),
                    "source_url": doc.get("source_url",""), "doc_type": doc.get("doc_type",""),
                    "agent_scope": req.agent_id}
            pipeline.ingest(text, meta, agent.collection_name)

    bg.add_task(_do_crawl)
    return {"status": "crawl_started", "source": req.source, "query": req.query}


# ═══════════════════════════════════════════════════════════════════════════
# FEEDBACK
# ═══════════════════════════════════════════════════════════════════════════
class FeedbackRequest(BaseModel):
    message_id:     Optional[str] = None
    conversation_id: Optional[str] = None
    rating:         int  # 1-5
    helpful:        bool = True
    accurate:       bool = True
    comment:        Optional[str] = None
    agent_id:       Optional[str] = None
    disease_code:   Optional[str] = None

@app.post("/api/feedback")
async def feedback(req: FeedbackRequest, current: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    fb = PatientFeedback(id=str(uuid.uuid4()), user_id=current["user_id"],
                          message_id=req.message_id, conversation_id=req.conversation_id,
                          rating=req.rating, helpful=req.helpful, accurate=req.accurate,
                          comment=req.comment, agent_id=req.agent_id, disease_code=req.disease_code)
    db.add(fb)
    return {"status": "submitted", "feedback_id": fb.id}


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN STATS
# ═══════════════════════════════════════════════════════════════════════════
@app.get("/api/admin/overview")
async def admin_overview(current: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    users_count  = (await db.execute(func.count(User.id))).scalar()
    conv_count   = (await db.execute(func.count(Conversation.id))).scalar()
    msg_count    = (await db.execute(func.count(Message.id))).scalar()
    doc_count    = (await db.execute(func.count(IndexedDocument.id))).scalar()

    ragas_res = await db.execute(
        select(func.avg(RAGASMetric.faithfulness), func.avg(RAGASMetric.answer_relevancy),
               func.avg(RAGASMetric.context_recall), func.avg(RAGASMetric.overall_score)))
    ragas_row = ragas_res.first()

    fb_res = await db.execute(func.avg(PatientFeedback.rating))
    avg_rating = fb_res.scalar() or 0

    return {
        "users":         users_count or 0,
        "conversations": conv_count or 0,
        "messages":      msg_count or 0,
        "documents":     doc_count or 0,
        "avg_feedback":  round(float(avg_rating or 0), 2),
        "ragas": {
            "faithfulness":     round(float(ragas_row[0] or 0), 3),
            "answer_relevancy": round(float(ragas_row[1] or 0), 3),
            "context_recall":   round(float(ragas_row[2] or 0), 3),
            "overall":          round(float(ragas_row[3] or 0), 3),
        },
    }

@app.get("/api/admin/conversations")
async def admin_conversations(limit: int = 50, current: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Conversation).order_by(desc(Conversation.updated_at)).limit(limit))
    convs = res.scalars().all()
    return [{"id": c.id, "user_id": c.user_id, "disease_code": c.disease_code,
             "agent_id": c.agent_id, "total_messages": c.total_messages,
             "avg_confidence": c.avg_confidence, "escalated": c.escalated,
             "created_at": c.created_at.isoformat()} for c in convs]

@app.get("/api/admin/documents")
async def admin_documents(current: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(IndexedDocument).order_by(desc(IndexedDocument.created_at)).limit(100))
    docs = res.scalars().all()
    return [{"id": d.id, "title": d.title, "source": d.source, "agent_id": d.agent_id,
             "disease_code": d.disease_code, "chunk_count": d.chunk_count,
             "prerag_tier": d.prerag_tier, "prerag_score": d.prerag_score,
             "created_at": d.created_at.isoformat()} for d in docs]

@app.get("/api/admin/ragas")
async def admin_ragas(current: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(RAGASMetric).order_by(desc(RAGASMetric.created_at)).limit(200))
    metrics = res.scalars().all()
    return [{"agent_id": m.agent_id, "disease_code": m.disease_code,
             "faithfulness": m.faithfulness, "answer_relevancy": m.answer_relevancy,
             "context_recall": m.context_recall, "context_precision": m.context_precision,
             "answer_similarity": m.answer_similarity, "overall": m.overall_score,
             "created_at": m.created_at.isoformat()} for m in metrics]

@app.get("/api/admin/feedback")
async def admin_feedback(current: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(PatientFeedback).order_by(desc(PatientFeedback.created_at)).limit(100))
    fbs = res.scalars().all()
    return [{"id": f.id, "user_id": f.user_id, "rating": f.rating,
             "helpful": f.helpful, "accurate": f.accurate,
             "agent_id": f.agent_id, "disease_code": f.disease_code,
             "comment": f.comment, "created_at": f.created_at.isoformat()} for f in fbs]

@app.get("/api/admin/alerts")
async def admin_alerts(current: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemAlert).where(SystemAlert.resolved == False).order_by(desc(SystemAlert.created_at)))
    alerts = res.scalars().all()
    return [{"id": a.id, "level": a.level, "title": a.title, "message": a.message,
             "component": a.component, "created_at": a.created_at.isoformat()} for a in alerts]

@app.put("/api/admin/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str, current: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SystemAlert).where(SystemAlert.id == alert_id))
    alert = res.scalar_one_or_none()
    if not alert: raise HTTPException(404, "Alert not found")
    alert.resolved = True
    return {"status": "resolved"}

@app.get("/api/admin/vector-store")
async def admin_vector_store(current: dict = Depends(require_admin)):
    pipeline = get_rag_pipeline()
    from config.disease_config import ALL_COLLECTIONS
    stats = []
    for col in ALL_COLLECTIONS:
        count = pipeline.store.count(col)
        stats.append({"collection": col, "document_count": count})
    return stats

import io
