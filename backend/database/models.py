"""PRISM — SQLAlchemy Async Database Models"""
import uuid
from datetime import datetime
from sqlalchemy import (
    String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, JSON, Enum as SAEnum, UniqueConstraint, text
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.ext.asyncio import AsyncAttrs, create_async_engine, async_sessionmaker
from sqlalchemy.dialects.postgresql import UUID, JSONB
from backend.config.settings import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=False, pool_size=10, max_overflow=20)
AsyncSession = async_sessionmaker(engine, expire_on_commit=False)


class Base(AsyncAttrs, DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id:            Mapped[str]  = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email:         Mapped[str]  = mapped_column(String(255), unique=True, nullable=False, index=True)
    name:          Mapped[str]  = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role:          Mapped[str]  = mapped_column(SAEnum("patient","admin","doctor", name="user_role"), default="patient")
    subscription:  Mapped[str]  = mapped_column(SAEnum("free","basic","premium","enterprise", name="sub_tier"), default="free")
    subscribed_diseases: Mapped[list] = mapped_column(JSON, default=list)
    language:      Mapped[str]  = mapped_column(String(10), default="en")
    country:       Mapped[str]  = mapped_column(String(100), default="USA")
    is_active:     Mapped[bool] = mapped_column(Boolean, default=True)
    created_at:    Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login:    Mapped[datetime] = mapped_column(DateTime, nullable=True)
    login_count:   Mapped[int]  = mapped_column(Integer, default=0)
    conversations: Mapped[list["Conversation"]] = relationship(back_populates="user", lazy="select")
    feedback:      Mapped[list["PatientFeedback"]] = relationship(back_populates="user", lazy="select")


class Conversation(Base):
    __tablename__ = "conversations"
    id:             Mapped[str]  = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id:        Mapped[str]  = mapped_column(String(36), ForeignKey("users.id"), index=True)
    disease_code:   Mapped[str]  = mapped_column(String(10))
    agent_id:       Mapped[str]  = mapped_column(String(20))
    title:          Mapped[str]  = mapped_column(String(500), default="New Conversation")
    language:       Mapped[str]  = mapped_column(String(10), default="en")
    total_messages: Mapped[int]  = mapped_column(Integer, default=0)
    avg_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    escalated:      Mapped[bool]  = mapped_column(Boolean, default=False)
    created_at:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    topic_label:    Mapped[str]  = mapped_column(String(500), nullable=True)
    meta_json:      Mapped[dict]  = mapped_column(JSONB, default=dict)  # Stores ConversationState
    is_hidden:      Mapped[bool]  = mapped_column(Boolean, default=False)
    user:           Mapped["User"] = relationship(back_populates="conversations")
    messages:       Mapped[list["Message"]] = relationship(back_populates="conversation", order_by="Message.created_at", lazy="select")


class Message(Base):
    __tablename__ = "messages"
    id:             Mapped[str]   = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id: Mapped[str]  = mapped_column(String(36), ForeignKey("conversations.id"), index=True)
    role:           Mapped[str]   = mapped_column(SAEnum("user","assistant","system", name="msg_role"))
    content:        Mapped[str]   = mapped_column(Text)
    translated_content: Mapped[str] = mapped_column(Text, nullable=True)
    original_language: Mapped[str]  = mapped_column(String(10), default="en")
    agent_id:       Mapped[str]   = mapped_column(String(20), nullable=True)
    confidence:     Mapped[float] = mapped_column(Float, default=0.0)
    frustration:    Mapped[int]   = mapped_column(Integer, default=0)
    citations:      Mapped[list]  = mapped_column(JSON, default=list)
    retrieved_chunks: Mapped[list] = mapped_column(JSON, default=list)
    ragas_scores:   Mapped[dict]  = mapped_column(JSON, default=dict)
    multimodal_type: Mapped[str]  = mapped_column(String(20), nullable=True)  # image/audio/text
    processing_ms:  Mapped[int]   = mapped_column(Integer, default=0)
    is_clarifying_question: Mapped[bool] = mapped_column(Boolean, default=False)
    chroma_grounded:        Mapped[bool] = mapped_column(Boolean, default=False)
    llm_fallback:           Mapped[bool] = mapped_column(Boolean, default=False)
    response_source:        Mapped[str]  = mapped_column(String(20), nullable=True)
    retrieval_detail:       Mapped[dict]  = mapped_column(JSON, default=dict)

    # 🆕 Conversational Engine metadata
    follow_up_questions: Mapped[list] = mapped_column(JSON, default=list)
    follow_up_prompt:    Mapped[str]  = mapped_column(Text, nullable=True)
    response_format:     Mapped[str]  = mapped_column(String(50), nullable=True)
    intent:              Mapped[str]   = mapped_column(String(50), nullable=True)
    generic_support:     Mapped[list]  = mapped_column(JSON, default=list)
    visual_payload:      Mapped[dict]  = mapped_column(JSON, default=dict)
    
    created_at:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    conversation:   Mapped["Conversation"] = relationship(back_populates="messages")


class PatientFeedback(Base):
    __tablename__ = "patient_feedback"
    id:             Mapped[str]   = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id:        Mapped[str]   = mapped_column(String(36), ForeignKey("users.id"))
    message_id:     Mapped[str]   = mapped_column(String(36), nullable=True)
    conversation_id: Mapped[str]  = mapped_column(String(36), nullable=True)
    rating:         Mapped[int]   = mapped_column(Integer)  # 1-5
    helpful:        Mapped[bool]  = mapped_column(Boolean, default=True)
    accurate:       Mapped[bool]  = mapped_column(Boolean, default=True)
    comment:        Mapped[str]   = mapped_column(Text, nullable=True)
    agent_id:       Mapped[str]   = mapped_column(String(20), nullable=True)
    disease_code:   Mapped[str]   = mapped_column(String(10), nullable=True)
    tags:           Mapped[list]  = mapped_column(JSON, default=list)  # Grievance tags
    created_at:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user:           Mapped["User"] = relationship(back_populates="feedback")


class IndexedDocument(Base):
    __tablename__ = "indexed_documents"
    id:             Mapped[str]   = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title:          Mapped[str]   = mapped_column(String(1000))
    source:         Mapped[str]   = mapped_column(String(500))
    source_url:     Mapped[str]   = mapped_column(String(2000), nullable=True)
    collection_name: Mapped[str]  = mapped_column(String(100), index=True)
    agent_id:       Mapped[str]   = mapped_column(String(20), index=True)
    disease_code:   Mapped[str]   = mapped_column(String(10))
    doc_type:       Mapped[str]   = mapped_column(String(50))  # pdf/web/pubmed/cdc
    evidence_grade: Mapped[str]   = mapped_column(String(5), nullable=True)  # A/B/C
    publication_year: Mapped[int] = mapped_column(Integer, nullable=True)
    prerag_score:   Mapped[float] = mapped_column(Float, default=0.0)
    prerag_tier:    Mapped[str]   = mapped_column(String(30), default="PENDING")
    chunk_count:    Mapped[int]   = mapped_column(Integer, default=0)
    token_count:    Mapped[int]   = mapped_column(Integer, default=0)
    doc_hash:       Mapped[str]   = mapped_column(String(32), nullable=True)
    is_active:      Mapped[bool]  = mapped_column(Boolean, default=True)
    metadata_json:  Mapped[dict]  = mapped_column(JSON, default=dict)
    created_at:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # 🆕 Relationship for Pre-RAG reporting
    prerag_report:  Mapped["PreRAGResult"] = relationship(back_populates="document", uselist=False)


class LLMCallLog(Base):
    __tablename__ = "llm_call_logs"
    id:             Mapped[str]   = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id:        Mapped[str]   = mapped_column(String(36), nullable=True)
    conversation_id: Mapped[str]  = mapped_column(String(36), nullable=True)
    agent_id:       Mapped[str]   = mapped_column(String(20))
    model:          Mapped[str]   = mapped_column(String(100))
    provider:       Mapped[str]   = mapped_column(String(50))
    prompt_tokens:  Mapped[int]   = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens:   Mapped[int]   = mapped_column(Integer, default=0)
    cost_usd:       Mapped[float] = mapped_column(Float, default=0.0)
    latency_ms:     Mapped[int]   = mapped_column(Integer, default=0)
    success:        Mapped[bool]  = mapped_column(Boolean, default=True)
    error_message:  Mapped[str]   = mapped_column(Text, nullable=True)
    created_at:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RAGASMetric(Base):
    __tablename__ = "ragas_metrics"
    id:             Mapped[str]   = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id:     Mapped[str]   = mapped_column(String(36), nullable=True)
    conversation_id: Mapped[str]  = mapped_column(String(36), nullable=True)
    agent_id:       Mapped[str]   = mapped_column(String(20))
    disease_code:   Mapped[str]   = mapped_column(String(10))
    faithfulness:   Mapped[float] = mapped_column(Float, default=0.0)
    answer_relevancy: Mapped[float] = mapped_column(Float, default=0.0)
    context_recall: Mapped[float] = mapped_column(Float, default=0.0)
    context_precision: Mapped[float] = mapped_column(Float, default=0.0)
    answer_similarity: Mapped[float] = mapped_column(Float, default=0.0)
    answer_correctness: Mapped[float] = mapped_column(Float, default=0.0)
    retrieval_relevancy: Mapped[float] = mapped_column(Float, default=0.0)
    overall_score:  Mapped[float] = mapped_column(Float, default=0.0)
    
    # Efficiency & Accuracy
    utilization:     Mapped[float] = mapped_column(Float, default=0.0)
    entity_recall:   Mapped[float] = mapped_column(Float, default=0.0)
    noise_sensitivity: Mapped[float] = mapped_column(Float, default=0.0)
    conciseness:     Mapped[float] = mapped_column(Float, default=0.0)
    token_efficiency: Mapped[float] = mapped_column(Float, default=0.0)
    failure_rate:    Mapped[float] = mapped_column(Float, default=0.0)
    critique_depth:  Mapped[float] = mapped_column(Float, default=0.0)
    coherence:       Mapped[float] = mapped_column(Float, default=0.0)
    
    # Safety
    harmlessness:     Mapped[float] = mapped_column(Float, default=0.0)
    refusal_precision: Mapped[float] = mapped_column(Float, default=0.0)
    disclaimer_compliance: Mapped[float] = mapped_column(Float, default=0.0)
    safe_messaging:   Mapped[float] = mapped_column(Float, default=0.0)
    
    # Linguistic
    bert_score:      Mapped[float] = mapped_column(Float, default=0.0)
    bleu_score:      Mapped[float] = mapped_column(Float, default=0.0)
    rouge_score:     Mapped[float] = mapped_column(Float, default=0.0)
    meteor_score:    Mapped[float] = mapped_column(Float, default=0.0)
    mrr_score:       Mapped[float] = mapped_column(Float, default=0.0)
    perplexity:      Mapped[float] = mapped_column(Float, default=0.0)

    confidence:     Mapped[float] = mapped_column(Float, default=0.0)
    frustration:    Mapped[int]   = mapped_column(Integer, default=0)
    processing_ms:  Mapped[int]   = mapped_column(Integer, default=0)
    created_at:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SystemAlert(Base):
    __tablename__ = "system_alerts"
    id:             Mapped[str]   = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    level:          Mapped[str]   = mapped_column(SAEnum("critical","warning","info", name="alert_level"))
    title:          Mapped[str]   = mapped_column(String(500))
    message:        Mapped[str]   = mapped_column(Text)
    component:      Mapped[str]   = mapped_column(String(100), nullable=True)
    resolved:       Mapped[bool]  = mapped_column(Boolean, default=False)
    created_at:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PreRAGResult(Base):
    __tablename__ = "prerag_results"
    id:             Mapped[str]   = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id:    Mapped[str]   = mapped_column(String(36), ForeignKey("indexed_documents.id"), nullable=True)
    doc_title:      Mapped[str]   = mapped_column(String(1000))
    agent_id:       Mapped[str]   = mapped_column(String(20))
    total_score:    Mapped[float] = mapped_column(Float, default=0.0)
    tier1_score:    Mapped[float] = mapped_column(Float, default=0.0)
    tier2_score:    Mapped[float] = mapped_column(Float, default=0.0)
    quality_standard: Mapped[str] = mapped_column(String(30))
    auto_rejected:  Mapped[bool]  = mapped_column(Boolean, default=False)
    reject_reasons: Mapped[list]  = mapped_column(JSON, default=list)
    gap_reasons:    Mapped[dict]  = mapped_column(JSON, default=dict)
    dim_scores:     Mapped[dict]  = mapped_column(JSON, default=dict)
    latam_countries: Mapped[list] = mapped_column(JSON, default=list)
    pii_masked:     Mapped[int]   = mapped_column(Integer, default=0)
    created_at:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    document:       Mapped["IndexedDocument"] = relationship(back_populates="prerag_report")


class ImageUpload(Base):
    __tablename__ = "image_uploads"
    id:             Mapped[str]   = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id:        Mapped[str]   = mapped_column(String(36), ForeignKey("users.id"))
    conversation_id: Mapped[str]  = mapped_column(String(36), ForeignKey("conversations.id"), nullable=True)
    agent_id:       Mapped[str]   = mapped_column(String(20))
    filename:       Mapped[str]   = mapped_column(String(255))
    file_path:      Mapped[str]   = mapped_column(String(1000))
    content_type:   Mapped[str]   = mapped_column(String(50))
    file_size:      Mapped[int]   = mapped_column(Integer)
    is_medical:     Mapped[bool]  = mapped_column(Boolean, default=True)
    image_type:     Mapped[str]   = mapped_column(String(100), nullable=True)
    f1_score:       Mapped[float] = mapped_column(Float, nullable=True)
    analysis_result: Mapped[dict] = mapped_column(JSON, default=dict)
    
    # 🆕 Fields for generated images
    image_url:      Mapped[str]   = mapped_column(String(2000), nullable=True)
    intent_id:      Mapped[str]   = mapped_column(String(100), nullable=True)
    prompt:         Mapped[str]   = mapped_column(Text, nullable=True)
    provider:       Mapped[str]   = mapped_column(String(50), nullable=True)
    
    created_at:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class VideoGeneration(Base):
    __tablename__ = "video_generations"
    id:             Mapped[str]   = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id:        Mapped[str]   = mapped_column(String(36), ForeignKey("users.id"))
    conversation_id: Mapped[str]  = mapped_column(String(36), ForeignKey("conversations.id"), nullable=True)
    video_url:      Mapped[str]   = mapped_column(String(2000))
    intent_id:      Mapped[str]   = mapped_column(String(100))
    prompt:         Mapped[str]   = mapped_column(Text)
    duration_s:     Mapped[int]   = mapped_column(Integer)
    clip_count:     Mapped[int]   = mapped_column(Integer)
    created_at:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ChromaCollection(Base):
    """
    One row per ChromaDB collection: name, chunk count, chunk id list, embedding model.
    Updated on ingest and startup sync from live Chroma.
    """
    __tablename__ = "chroma_collections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    collection_name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    chunk_ids: Mapped[list] = mapped_column(JSON, default=list)
    embedding_model: Mapped[str] = mapped_column(String(120), default="BAAI/bge-base-en-v1.5")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class AgentQuestion(Base):
    __tablename__ = "agent_questions"
    id:             Mapped[str]   = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id:       Mapped[str]   = mapped_column(String(20), index=True)
    text:           Mapped[str]   = mapped_column(Text)
    consecutive_misses: Mapped[int] = mapped_column(Integer, default=0)
    selection_count: Mapped[int]  = mapped_column(Integer, default=0)
    is_active:      Mapped[bool]  = mapped_column(Boolean, default=True)
    created_at:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DoctorDetail(Base):
    __tablename__ = "doctor_details"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    doctor_name: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    disease_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    therapeutic_area: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    availability: Mapped[str] = mapped_column(String(10), nullable=False)
    time1: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    time2: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    time3: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    bookings: Mapped[list["DoctorAppointmentBooking"]] = relationship(
        back_populates="doctor", lazy="select"
    )


class DoctorAppointmentBooking(Base):
    __tablename__ = "doctor_appointment_bookings"
    __table_args__ = (
        UniqueConstraint("doctor_detail_id", "slot_start", name="uq_doctor_slot_start"),
        UniqueConstraint("user_id", "agent_id", name="uq_user_agent_booking"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    doctor_detail_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("doctor_details.id"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    agent_id: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    conversation_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    slot_start: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    slot_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    slot_number: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    doctor: Mapped["DoctorDetail"] = relationship(back_populates="bookings")


async def create_tables():
    async with engine.begin() as conn:
        print(f"[DB] Connected to database engine: {engine.url.render_as_string(hide_password=True)}")
        print("[DB] Running Base.metadata.create_all...")
        await conn.run_sync(Base.metadata.create_all)
        
        # Ensure new columns exist (for existing databases)
        # Note: IF NOT EXISTS is supported in PostgreSQL 9.6+
        print("[DB] Checking for required migrations and extensions...")
        statements = [
            ("pg_trgm extension", "CREATE EXTENSION IF NOT EXISTS pg_trgm"),
            ("conversation title", "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title VARCHAR(500) DEFAULT 'New Conversation'"),
            ("conversation topic_label", "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS topic_label VARCHAR(500) NULL"),
            ("conversation language", "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en'"),
            ("conversation total_messages", "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS total_messages INTEGER DEFAULT 0"),
            ("conversation escalated", "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT FALSE"),
            ("conversation created_at", "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("conversation updated_at", "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("conversation meta_json", "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS meta_json JSONB DEFAULT '{}'::jsonb"),
            ("conversation is_hidden", "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE"),
            ("user login_count", "ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0"),
            ("feedback tags", "ALTER TABLE patient_feedback ADD COLUMN IF NOT EXISTS tags JSON DEFAULT '[]'"),
            ("indexed_documents prerag_score", "ALTER TABLE indexed_documents ADD COLUMN IF NOT EXISTS prerag_score FLOAT DEFAULT 0.0"),
            ("indexed_documents prerag_tier", "ALTER TABLE indexed_documents ADD COLUMN IF NOT EXISTS prerag_tier VARCHAR(30) DEFAULT 'PENDING'"),
            ("prerag_results gap_reasons", "ALTER TABLE prerag_results ADD COLUMN IF NOT EXISTS gap_reasons JSON DEFAULT '{}'::json"),
            
            ("ragas_metrics confidence", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 0.0"),
            ("ragas_metrics frustration", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS frustration INTEGER DEFAULT 0"),
            ("ragas_metrics processing_ms", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS processing_ms INTEGER DEFAULT 0"),
            ("ragas_metrics answer_correctness", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS answer_correctness FLOAT DEFAULT 0.0"),
            ("ragas_metrics retrieval_relevancy", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS retrieval_relevancy FLOAT DEFAULT 0.0"),
            ("ragas_metrics utilization", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS utilization FLOAT DEFAULT 0.0"),
            ("ragas_metrics entity_recall", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS entity_recall FLOAT DEFAULT 0.0"),
            ("ragas_metrics noise_sensitivity", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS noise_sensitivity FLOAT DEFAULT 0.0"),
            ("ragas_metrics conciseness", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS conciseness FLOAT DEFAULT 0.0"),
            ("ragas_metrics token_efficiency", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS token_efficiency FLOAT DEFAULT 0.0"),
            ("ragas_metrics failure_rate", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS failure_rate FLOAT DEFAULT 0.0"),
            ("ragas_metrics critique_depth", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS critique_depth FLOAT DEFAULT 0.0"),
            ("ragas_metrics coherence", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS coherence FLOAT DEFAULT 0.0"),
            ("ragas_metrics harmlessness", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS harmlessness FLOAT DEFAULT 0.0"),
            ("ragas_metrics refusal_precision", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS refusal_precision FLOAT DEFAULT 0.0"),
            ("ragas_metrics disclaimer_compliance", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS disclaimer_compliance FLOAT DEFAULT 0.0"),
            ("ragas_metrics safe_messaging", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS safe_messaging FLOAT DEFAULT 0.0"),
            ("ragas_metrics bert_score", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS bert_score FLOAT DEFAULT 0.0"),
            ("ragas_metrics bleu_score", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS bleu_score FLOAT DEFAULT 0.0"),
            ("ragas_metrics rouge_score", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS rouge_score FLOAT DEFAULT 0.0"),
            ("ragas_metrics meteor_score", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS meteor_score FLOAT DEFAULT 0.0"),
            ("ragas_metrics mrr_score", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS mrr_score FLOAT DEFAULT 0.0"),
            ("ragas_metrics perplexity", "ALTER TABLE ragas_metrics ADD COLUMN IF NOT EXISTS perplexity FLOAT DEFAULT 0.0"),
            
            ("message follow_up_questions", "ALTER TABLE messages ADD COLUMN IF NOT EXISTS follow_up_questions JSON DEFAULT '[]'"),
            ("message follow_up_prompt", "ALTER TABLE messages ADD COLUMN IF NOT EXISTS follow_up_prompt TEXT NULL"),
            ("message response_format", "ALTER TABLE messages ADD COLUMN IF NOT EXISTS response_format VARCHAR(50) NULL"),
            ("message intent", "ALTER TABLE messages ADD COLUMN IF NOT EXISTS intent VARCHAR(50) NULL"),
            ("message generic_support", "ALTER TABLE messages ADD COLUMN IF NOT EXISTS generic_support JSON DEFAULT '[]'"),
            ("message visual_payload", "ALTER TABLE messages ADD COLUMN IF NOT EXISTS visual_payload JSON DEFAULT '{}'::json"),
            ("message chroma_grounded", "ALTER TABLE messages ADD COLUMN IF NOT EXISTS chroma_grounded BOOLEAN DEFAULT FALSE"),
            ("message llm_fallback", "ALTER TABLE messages ADD COLUMN IF NOT EXISTS llm_fallback BOOLEAN DEFAULT FALSE"),
            ("message response_source", "ALTER TABLE messages ADD COLUMN IF NOT EXISTS response_source VARCHAR(20) NULL"),
            ("message retrieval_detail", "ALTER TABLE messages ADD COLUMN IF NOT EXISTS retrieval_detail JSON DEFAULT '{}'::json"),
            ("message remap chroma to cdc_pubmed",
             "UPDATE messages SET response_source = 'cdc_pubmed' WHERE response_source = 'chroma'"),
            ("message source clarifying",
             "UPDATE messages SET response_source = 'clarifying', chroma_grounded = FALSE, llm_fallback = FALSE "
             "WHERE role = 'assistant' AND COALESCE(is_clarifying_question, FALSE) = TRUE"),
            ("message source multimodal",
             "UPDATE messages SET response_source = 'multimodal', chroma_grounded = FALSE, llm_fallback = FALSE "
             "WHERE role = 'assistant' AND multimodal_type IS NOT NULL "
             "AND COALESCE(is_clarifying_question, FALSE) = FALSE "
             "AND (response_source IS NULL OR response_source = '')"),
            ("message source cdc_pubmed",
             "UPDATE messages SET response_source = 'cdc_pubmed', chroma_grounded = TRUE, llm_fallback = FALSE "
             "WHERE role = 'assistant' AND COALESCE(is_clarifying_question, FALSE) = FALSE "
             "AND multimodal_type IS NULL "
             "AND (response_source IN ('chroma', 'cdc_pubmed') "
             "     OR COALESCE(chroma_grounded, FALSE) = TRUE "
             "     OR (citations IS NOT NULL AND citations::text NOT IN ('[]', 'null', '{}')))"),
            ("message source llm_fallback",
             "UPDATE messages SET response_source = 'llm_fallback', chroma_grounded = FALSE, llm_fallback = TRUE "
             "WHERE role = 'assistant' AND COALESCE(is_clarifying_question, FALSE) = FALSE "
             "AND multimodal_type IS NULL AND response_format IS NOT NULL "
             "AND (response_source IS NULL OR response_source = '')"),
            ("message source legacy",
             "UPDATE messages SET response_source = 'legacy', chroma_grounded = FALSE, llm_fallback = FALSE "
             "WHERE role = 'assistant' AND (response_source IS NULL OR response_source = '')"),
            ("message fix both true",
             "UPDATE messages SET chroma_grounded = TRUE, llm_fallback = FALSE, response_source = 'cdc_pubmed' "
             "WHERE role = 'assistant' AND chroma_grounded = TRUE AND llm_fallback = TRUE"),

            ("image_upload image_url", "ALTER TABLE image_uploads ADD COLUMN IF NOT EXISTS image_url VARCHAR(2000) NULL"),
            ("image_upload intent_id", "ALTER TABLE image_uploads ADD COLUMN IF NOT EXISTS intent_id VARCHAR(100) NULL"),
            ("image_upload prompt", "ALTER TABLE image_uploads ADD COLUMN IF NOT EXISTS prompt TEXT NULL"),
            ("image_upload provider", "ALTER TABLE image_uploads ADD COLUMN IF NOT EXISTS provider VARCHAR(50) NULL"),
            
            ("chroma_collections drop legacy registry",
             "DROP TABLE IF EXISTS chroma_vector_registry CASCADE"),
            ("chroma_collections table",
             "CREATE TABLE IF NOT EXISTS chroma_collections ("
             "  id VARCHAR(36) PRIMARY KEY, "
             "  collection_name VARCHAR(150) NOT NULL UNIQUE, "
             "  chunk_count INTEGER NOT NULL DEFAULT 0, "
             "  chunk_ids JSON NOT NULL DEFAULT '[]', "
             "  embedding_model VARCHAR(120) DEFAULT 'BAAI/bge-base-en-v1.5', "
             "  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
             "  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
             ")"),

            ("video_generations table", 
             "CREATE TABLE IF NOT EXISTS video_generations ("
             "  id VARCHAR(36) PRIMARY KEY, "
             "  user_id VARCHAR(36), "
             "  conversation_id VARCHAR(36), "
             "  video_url VARCHAR(2000), "
             "  intent_id VARCHAR(100), "
             "  prompt TEXT, "
             "  duration_s INTEGER, "
             "  clip_count INTEGER, "
             "  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
             ")"),

            ("doctor_details time1 timestamp",
             "ALTER TABLE doctor_details ALTER COLUMN time1 TYPE TIMESTAMP "
             "USING TIMESTAMP '2000-01-01 15:30:00'"),
            ("doctor_details time2 timestamp",
             "ALTER TABLE doctor_details ALTER COLUMN time2 TYPE TIMESTAMP "
             "USING TIMESTAMP '2000-01-01 16:00:00'"),
            ("doctor_details time3 timestamp",
             "ALTER TABLE doctor_details ALTER COLUMN time3 TYPE TIMESTAMP "
             "USING TIMESTAMP '2000-01-01 16:30:00'"),
            ("doctor_appointment_bookings table",
             "CREATE TABLE IF NOT EXISTS doctor_appointment_bookings ("
             "  id VARCHAR(36) PRIMARY KEY, "
             "  doctor_detail_id VARCHAR(36) NOT NULL REFERENCES doctor_details(id), "
             "  user_id VARCHAR(36) NOT NULL REFERENCES users(id), "
             "  conversation_id VARCHAR(36), "
             "  slot_start TIMESTAMP NOT NULL, "
             "  slot_end TIMESTAMP NOT NULL, "
             "  slot_number INTEGER NOT NULL, "
             "  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
             "  UNIQUE (doctor_detail_id, slot_start)"
             ")"),
            ("doctor_appointment_bookings agent_id",
             "ALTER TABLE doctor_appointment_bookings ADD COLUMN IF NOT EXISTS agent_id VARCHAR(20)"),
            ("doctor_appointment_bookings user agent unique",
             "CREATE UNIQUE INDEX IF NOT EXISTS uq_user_agent_booking "
             "ON doctor_appointment_bookings (user_id, agent_id) "
             "WHERE agent_id IS NOT NULL AND TRIM(agent_id) <> ''"),
        ]
        
        for label, stmt in statements:
            try:
                await conn.execute(text(stmt))
            except Exception as e:
                # Some errors (like missing permissions for extensions) should be warnings, not crashes
                if "extension" in label:
                    print(f"[DB_MIGRATION_WARNING] Could not enable {label}: {e} (App will continue, but fuzzy search might be slower)")
                else:
                    print(f"[DB_MIGRATION_WARNING] Could not execute {label} migration: {e}")
        
        print("[DB] Database migration check complete.")

    from backend.core.appointments.doctor_appointments import backfill_missing_booking_agent_ids
    async with AsyncSession() as session:
        try:
            await backfill_missing_booking_agent_ids(session)
        except Exception as e:
            print(f"[DB_MIGRATION_WARNING] Could not backfill booking agent_id values: {e}")


async def get_db():
    async with AsyncSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
