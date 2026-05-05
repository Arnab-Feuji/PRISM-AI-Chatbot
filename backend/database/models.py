"""PRISM — SQLAlchemy Async Database Models"""
import uuid
from datetime import datetime
from sqlalchemy import (
    String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, JSON, Enum as SAEnum
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.ext.asyncio import AsyncAttrs, create_async_engine, async_sessionmaker
from sqlalchemy.dialects.postgresql import UUID
from config.settings import get_settings

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
    is_active:     Mapped[bool] = mapped_column(Boolean, default=True)
    created_at:    Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login:    Mapped[datetime] = mapped_column(DateTime, nullable=True)
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
    overall_score:  Mapped[float] = mapped_column(Float, default=0.0)
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
    dim_scores:     Mapped[dict]  = mapped_column(JSON, default=dict)
    latam_countries: Mapped[list] = mapped_column(JSON, default=list)
    pii_masked:     Mapped[int]   = mapped_column(Integer, default=0)
    created_at:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


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
