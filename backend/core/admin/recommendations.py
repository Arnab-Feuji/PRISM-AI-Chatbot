# ═══════════════════════════════════════════════════════════════════════════════
# FILE: backend/core/admin/recommendations.py
# 360° Recommendation Engine — synthesizes RAGAS, Feedback, Alerts,
# Escalations, and Quality Metrics into actionable admin guidance.
# ═══════════════════════════════════════════════════════════════════════════════

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from backend.core.admin.admin_metrics import (
    AGENT_NAMES,
    DISEASE_ICONS,
    DISEASE_NAMES,
    HISTORY_DAYS,
    get_escalations,
    get_patient_feedback,
    get_quality_summary,
    get_ragas_metrics,
)


def _rec(
    *,
    rec_id: str,
    category: str,
    priority: str,
    title: str,
    description: str,
    action: str,
    impact: str,
    source_section: str,
    metric_value: Optional[float] = None,
    threshold: Optional[float] = None,
    related_entity: Optional[str] = None,
) -> Dict:
    return {
        "id": rec_id,
        "category": category,
        "priority": priority,
        "title": title,
        "description": description,
        "action": action,
        "impact": impact,
        "source_section": source_section,
        "metric_value": metric_value,
        "threshold": threshold,
        "related_entity": related_entity,
    }


def _priority_rank(p: str) -> int:
    return {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(p, 4)


def _generate_ragas_recommendations(ragas: Dict) -> List[Dict]:
    recs: List[Dict] = []
    avgs = ragas.get("averages", {})
    total = ragas.get("total_evaluations", 0)

    if total == 0:
        recs.append(_rec(
            rec_id="ragas-no-data",
            category="ragas",
            priority="high",
            title="No RAGAS evaluations recorded",
            description="The system has no retrieval-quality scores in the last 15 days, so answer quality cannot be verified.",
            action="Enable RAGAS scoring on chat responses and run test conversations across all disease agents to establish a baseline.",
            impact="both",
            source_section="RAGAS Metrics",
        ))
        return recs

    thresholds = {
        "faithfulness": (80.0, "Faithfulness", "answers may contain unsupported claims"),
        "answer_relevancy": (80.0, "Answer Relevancy", "responses may not address patient questions directly"),
        "context_recall": (75.0, "Context Recall", "retrieval may miss relevant clinical evidence"),
        "context_precision": (75.0, "Context Precision", "retrieved chunks may include irrelevant content"),
        "overall": (78.0, "Overall RAGAS", "composite retrieval quality is below target"),
    }

    for key, (thresh, label, symptom) in thresholds.items():
        val = avgs.get(key, 0)
        if val < thresh:
            priority = "critical" if val < thresh - 15 else "high" if val < thresh - 8 else "medium"
            recs.append(_rec(
                rec_id=f"ragas-{key}-low",
                category="ragas",
                priority=priority,
                title=f"{label} below target ({val}% vs {thresh}%)",
                description=f"Average {label.lower()} is {val}%. {symptom.capitalize()}, reducing patient trust in AI answers.",
                action=_ragas_action_for(key),
                impact="both",
                source_section="RAGAS Metrics",
                metric_value=val,
                threshold=thresh,
            ))

    for agent in ragas.get("per_agent", []):
        if agent.get("avg_score", 100) < 70 and agent.get("count", 0) >= 3:
            recs.append(_rec(
                rec_id=f"ragas-agent-{agent['agent_id']}",
                category="ragas",
                priority="high",
                title=f"Agent {agent['agent_name']} underperforming ({agent['avg_score']}%)",
                description=f"{agent['agent_name']} ({agent['agent_id']}) averages {agent['avg_score']}% RAGAS over {agent['count']} evaluations.",
                action=f"Review indexed documents for {agent['agent_name']}, re-run Pre-RAG scoring, and crawl fresh PubMed/CDC content for this specialty.",
                impact="portal_effectiveness",
                source_section="RAGAS Metrics",
                metric_value=agent["avg_score"],
                threshold=70.0,
                related_entity=agent["agent_id"],
            ))

    for disease in ragas.get("per_disease", []):
        if disease.get("avg_score", 100) < 72 and disease.get("count", 0) >= 3:
            recs.append(_rec(
                rec_id=f"ragas-disease-{disease['code']}",
                category="ragas",
                priority="medium",
                title=f"{disease['name']} disease area needs content refresh ({disease['avg_score']}%)",
                description=f"{disease['icon']} {disease['name']} patients receive answers scoring {disease['avg_score']}% on retrieval quality.",
                action=f"Upload disease-specific clinical guidelines and trigger a PubMed crawl for {disease['name']} agents.",
                impact="patient_satisfaction",
                source_section="RAGAS Metrics",
                metric_value=disease["avg_score"],
                threshold=72.0,
                related_entity=disease["code"],
            ))

    return recs


def _ragas_action_for(metric_key: str) -> str:
    actions = {
        "faithfulness": "Strengthen citation grounding: enable cross-encoder reranking and verify indexed documents match agent disease scope.",
        "answer_relevancy": "Tune HyDE query transformation and review agent system prompts to stay focused on the patient's stated concern.",
        "context_recall": "Expand vector store coverage via Upload & Crawl; check hybrid chunker settings and collection sync status.",
        "context_precision": "Raise Pre-RAG quality thresholds before indexing and remove low-scoring documents from the vector store.",
        "overall": "Run a full Pre-RAG audit, refresh stale documents, and validate retrieval pipeline health in System Overview.",
    }
    return actions.get(metric_key, "Review RAGAS dashboard and address underperforming metrics.")


def _generate_feedback_recommendations(feedback: Dict) -> List[Dict]:
    recs: List[Dict] = []
    total = feedback.get("total_ratings", 0)
    avg = feedback.get("average_rating", 0)

    if total == 0:
        recs.append(_rec(
            rec_id="feedback-no-data",
            category="feedback",
            priority="medium",
            title="No patient feedback collected",
            description="Without ratings, satisfaction trends are invisible and improvement priorities cannot be validated.",
            action="Add a post-conversation feedback prompt in the patient portal and send a satisfaction survey to active users.",
            impact="patient_satisfaction",
            source_section="Patient Feedback",
        ))
        return recs

    if avg < 3.0:
        priority = "critical"
    elif avg < 3.5:
        priority = "high"
    elif avg < 4.0:
        priority = "medium"
    else:
        priority = None

    if priority:
        recs.append(_rec(
            rec_id="feedback-avg-low",
            category="feedback",
            priority=priority,
            title=f"Average patient rating is {avg}/5 — below satisfaction target",
            description=f"Across {total} ratings in the last {feedback.get('period_days', 15)} days, patients rate the portal {avg} stars on average.",
            action="Review recent low-rated comments, identify recurring themes, and prioritize fixes in the lowest-scoring disease areas.",
            impact="patient_satisfaction",
            source_section="Patient Feedback",
            metric_value=avg,
            threshold=4.0,
        ))

    dist = feedback.get("distribution", {})
    low_stars = int(dist.get("1", 0)) + int(dist.get("2", 0))
    if total > 0 and low_stars / total > 0.2:
        recs.append(_rec(
            rec_id="feedback-low-star-ratio",
            category="feedback",
            priority="high",
            title=f"{round(low_stars / total * 100)}% of ratings are 1–2 stars",
            description=f"{low_stars} of {total} ratings are dissatisfied (1–2 stars), signalling systemic experience gaps.",
            action="Escalate to clinical review: read the 10 most recent negative comments and map each to a specific agent or workflow fix.",
            impact="patient_satisfaction",
            source_section="Patient Feedback",
            metric_value=round(low_stars / total * 100, 1),
            threshold=20.0,
        ))

    for disease in feedback.get("per_disease", []):
        if disease.get("avg_rating", 5) < 3.5 and disease.get("count", 0) >= 2:
            recs.append(_rec(
                rec_id=f"feedback-disease-{disease['code']}",
                category="feedback",
                priority="high",
                title=f"{disease['name']} patients rate {disease['avg_rating']}/5",
                description=f"{disease['icon']} {disease['name']} has the lowest satisfaction ({disease['avg_rating']} stars from {disease['count']} ratings).",
                action=f"Assign a clinical champion for {disease['name']}: audit agent responses, update content, and monitor sentiment weekly.",
                impact="patient_satisfaction",
                source_section="Patient Feedback",
                metric_value=disease["avg_rating"],
                threshold=3.5,
                related_entity=disease["code"],
            ))

    negative_comments = [
        r for r in feedback.get("recent", [])
        if r.get("rating", 5) <= 2 and r.get("comment")
    ]
    if negative_comments:
        sample = negative_comments[0]
        recs.append(_rec(
            rec_id="feedback-negative-comment",
            category="feedback",
            priority="medium",
            title=f"Recent negative feedback from {sample.get('patient_name', 'a patient')}",
            description=f"\"{sample['comment'][:120]}{'…' if len(sample.get('comment', '')) > 120 else ''}\" — rated {sample.get('rating')}/5 via {sample.get('agent_name', 'unknown agent')}.",
            action="Contact the patient if appropriate, document the grievance, and verify whether the cited issue is reproducible in a test session.",
            impact="patient_satisfaction",
            source_section="Patient Feedback",
            related_entity=sample.get("agent_id"),
        ))

    if avg >= 4.0 and total >= 5:
        recs.append(_rec(
            rec_id="feedback-positive",
            category="feedback",
            priority="low",
            title=f"Strong patient satisfaction ({avg}/5 average)",
            description=f"Patients are rating the portal positively. Maintain momentum by publishing success stories and keeping content fresh.",
            action="Share top-rated agent workflows with underperforming disease teams and celebrate high-satisfaction milestones in the patient portal.",
            impact="patient_satisfaction",
            source_section="Patient Feedback",
            metric_value=avg,
            threshold=4.0,
        ))

    return recs


def _generate_alert_recommendations(alerts: List[Dict]) -> List[Dict]:
    recs: List[Dict] = []
    if not alerts:
        recs.append(_rec(
            rec_id="alerts-clear",
            category="alerts",
            priority="low",
            title="No unresolved system alerts",
            description="All monitored components are operating without active alerts.",
            action="Continue routine monitoring; schedule weekly alert review to catch regressions early.",
            impact="portal_effectiveness",
            source_section="Alerts",
        ))
        return recs

    critical = [a for a in alerts if a.get("level") == "critical"]
    warnings = [a for a in alerts if a.get("level") == "warning"]

    if critical:
        recs.append(_rec(
            rec_id="alerts-critical-count",
            category="alerts",
            priority="critical",
            title=f"{len(critical)} critical alert(s) require immediate action",
            description=f"Unresolved critical alerts: {', '.join(a.get('title', 'Alert') for a in critical[:3])}{'…' if len(critical) > 3 else ''}.",
            action="Open the Alerts section, resolve or escalate each critical item, and verify infrastructure health in System Overview.",
            impact="both",
            source_section="Alerts",
            metric_value=len(critical),
            threshold=0,
        ))

    guardrails = [a for a in alerts if (a.get("component") or "").startswith("guardrail:")]
    if guardrails:
        recs.append(_rec(
            rec_id="alerts-guardrail",
            category="alerts",
            priority="high",
            title=f"{len(guardrails)} guardrail event(s) detected",
            description="Clinical safety guardrails have fired, indicating responses that required blocking or modification.",
            action="Review guardrail logs, update refusal/disclaimer templates, and retrain agents on edge-case clinical queries.",
            impact="patient_satisfaction",
            source_section="Alerts",
            metric_value=len(guardrails),
        ))

    if warnings:
        recs.append(_rec(
            rec_id="alerts-warning-count",
            category="alerts",
            priority="medium",
            title=f"{len(warnings)} warning-level alert(s) pending",
            description="Warning alerts often precede escalations or degraded retrieval quality.",
            action="Triage warnings by component, resolve specialist-routing alerts first, then address infrastructure warnings.",
            impact="portal_effectiveness",
            source_section="Alerts",
            metric_value=len(warnings),
        ))

    return recs


def _generate_escalation_recommendations(escalations: Dict) -> List[Dict]:
    recs: List[Dict] = []
    total = escalations.get("total_escalations", 0)
    specialist = escalations.get("specialist_escalations", 0)
    human = escalations.get("human_escalations", 0)

    if total == 0:
        recs.append(_rec(
            rec_id="escalation-none",
            category="escalations",
            priority="low",
            title="No escalations in the monitoring period",
            description="Primary agents are handling patient queries without routing to specialists or humans.",
            action="Validate that escalation thresholds are not set too high; run stress-test scenarios to confirm routing still works.",
            impact="portal_effectiveness",
            source_section="Escalations",
        ))
        return recs

    human_rate = human / max(total, 1) * 100
    if human_rate > 30:
        recs.append(_rec(
            rec_id="escalation-human-high",
            category="escalations",
            priority="critical",
            title=f"Human escalation rate is {human_rate:.0f}% — patients frequently need live help",
            description=f"{human} of {total} escalations reached human coordinators, indicating primary agents cannot resolve patient needs.",
            action="Lower frustration thresholds gradually, improve primary-agent confidence via content updates, and add proactive check-in prompts before escalation.",
            impact="patient_satisfaction",
            source_section="Escalations",
            metric_value=round(human_rate, 1),
            threshold=30.0,
        ))
    elif human > 0:
        recs.append(_rec(
            rec_id="escalation-human-present",
            category="escalations",
            priority="medium",
            title=f"{human} human escalation(s) — monitor patient handoff quality",
            description="Some patients required human intervention. Ensure handoff messages are warm and response times meet SLA.",
            action="Review human escalation reasons in the Escalations dashboard and train primary agents on the top 3 recurring triggers.",
            impact="patient_satisfaction",
            source_section="Escalations",
            metric_value=human,
        ))

    if specialist > human * 2 and specialist >= 5:
        recs.append(_rec(
            rec_id="escalation-specialist-high",
            category="escalations",
            priority="high",
            title=f"{specialist} specialist escalations — primary agents lack depth",
            description="Frequent specialist routing suggests primary agents hit confidence limits on complex clinical questions.",
            action="Enrich specialist-tier knowledge bases, tune Smart Routing confidence thresholds, and add clarifying-question flows before escalation.",
            impact="portal_effectiveness",
            source_section="Escalations",
            metric_value=specialist,
        ))

    top_agents = escalations.get("by_agent", [])[:3]
    for agent in top_agents:
        if agent.get("total", 0) >= 3:
            recs.append(_rec(
                rec_id=f"escalation-agent-{agent['agent_id']}",
                category="escalations",
                priority="high" if agent.get("human", 0) > 0 else "medium",
                title=f"{agent['agent_name']} drives {agent['total']} escalation(s)",
                description=f"{agent.get('specialist', 0)} specialist + {agent.get('human', 0)} human escalations from {agent['agent_name']}.",
                action=f"Audit {agent['agent_name']} conversation logs, update its indexed content, and adjust routing thresholds for {agent['agent_id']}.",
                impact="both",
                source_section="Escalations",
                metric_value=agent["total"],
                related_entity=agent["agent_id"],
            ))

    return recs


def _generate_quality_recommendations(quality: Dict) -> List[Dict]:
    recs: List[Dict] = []
    patients = quality.get("active_patients", 0)
    avg_cqs = quality.get("avg_cqs", 0)
    dims = quality.get("dimensions", {})

    if patients == 0:
        recs.append(_rec(
            rec_id="quality-no-patients",
            category="quality",
            priority="medium",
            title="No active patients for quality scoring",
            description="CQS (Conversation Quality Score) requires patient conversations in the last 15 days.",
            action="Drive patient portal adoption: send onboarding emails, simplify login, and highlight voice-chat and multilingual features.",
            impact="patient_satisfaction",
            source_section="Quality Metrics",
        ))
        return recs

    dim_actions = {
        "engagement": (
            75.0,
            "Engagement score is low",
            "Patients are not returning or rating sessions highly.",
            "Add session summaries, personalized follow-up reminders, and gamified health-goal tracking in the patient portal.",
        ),
        "response_quality": (
            80.0,
            "Response quality dimension below target",
            "AI answers score low on faithfulness and relevancy combined.",
            "Cross-reference with RAGAS metrics: refresh documents, enable reranking, and shorten verbose responses.",
        ),
        "clinical_safety": (
            85.0,
            "Clinical safety needs attention",
            "Guardrail events, escalations, or missing citations are pulling safety scores down.",
            "Strengthen disclaimer injection, review escalation triggers, and ensure emergency-query detection is active.",
        ),
        "session_flow": (
            70.0,
            "Session flow friction detected",
            "Patients experience repeat questions, skipped intents, or rising frustration mid-session.",
            "Improve clarifying-question logic, reduce multi-turn loops, and add a 'start over' option in the patient UI.",
        ),
        "format_variety": (
            65.0,
            "Response format variety is limited",
            "Answers may be too uniform (wall-of-text), reducing readability for diverse patient literacy levels.",
            "Enable structured responses (bullet summaries, action steps, visual aids) and test with multilingual patients.",
        ),
        "velocity": (
            80.0,
            "Response latency impacting experience",
            "Slow processing times reduce perceived portal responsiveness.",
            "Check LLM call latency in System Overview, enable caching, and consider model tier optimization for common queries.",
        ),
    }

    if avg_cqs < 70:
        recs.append(_rec(
            rec_id="quality-cqs-low",
            category="quality",
            priority="critical",
            title=f"Average CQS is {avg_cqs} — portal effectiveness at risk",
            description=f"Conversation Quality Score across {patients} patients is {avg_cqs}/100 (target ≥ 75). Predicted star rating: {quality.get('avg_stars', 0)}/5.",
            action="Prioritize the lowest-scoring CQS dimensions below and run a 1-week improvement sprint with daily metric checks.",
            impact="both",
            source_section="Quality Metrics",
            metric_value=avg_cqs,
            threshold=75.0,
        ))
    elif avg_cqs < 80:
        recs.append(_rec(
            rec_id="quality-cqs-moderate",
            category="quality",
            priority="medium",
            title=f"CQS at {avg_cqs} — room for improvement",
            description=f"Portal is functional but not yet excellent. {patients} active patients scored in the last period.",
            action="Focus on the two weakest dimensions identified below to push CQS above 80.",
            impact="both",
            source_section="Quality Metrics",
            metric_value=avg_cqs,
            threshold=80.0,
        ))

    for dim_key, (thresh, title, desc, action) in dim_actions.items():
        val = dims.get(dim_key, 0)
        if val < thresh:
            recs.append(_rec(
                rec_id=f"quality-dim-{dim_key}",
                category="quality",
                priority="high" if val < thresh - 15 else "medium",
                title=f"{title} ({val}% vs {thresh}%)",
                description=desc,
                action=action,
                impact="both" if dim_key in ("engagement", "clinical_safety") else "portal_effectiveness",
                source_section="Quality Metrics",
                metric_value=val,
                threshold=thresh,
            ))

    low_cqs_patients = [p for p in quality.get("patients", []) if p.get("cqs", 100) < 60]
    if low_cqs_patients:
        recs.append(_rec(
            rec_id="quality-at-risk-patients",
            category="quality",
            priority="high",
            title=f"{len(low_cqs_patients)} patient(s) with CQS below 60",
            description="These patients are at churn risk due to poor conversation quality.",
            action="Proactively reach out to at-risk patients, offer a human coordinator session, and log outcomes in patient feedback.",
            impact="patient_satisfaction",
            source_section="Quality Metrics",
            metric_value=len(low_cqs_patients),
            threshold=0,
        ))

    return recs


def _generate_cross_cutting_recommendations(
    ragas: Dict,
    feedback: Dict,
    escalations: Dict,
    quality: Dict,
    alerts: List[Dict],
) -> List[Dict]:
    recs: List[Dict] = []

    ragas_overall = ragas.get("averages", {}).get("overall", 0)
    fb_avg = feedback.get("average_rating", 0)
    cqs = quality.get("avg_cqs", 0)
    esc_total = escalations.get("total_escalations", 0)

    if ragas_overall < 75 and fb_avg < 3.5 and fb_avg > 0:
        recs.append(_rec(
            rec_id="cross-ragas-feedback",
            category="cross_cutting",
            priority="critical",
            title="Low RAGAS and low feedback — content quality is the root cause",
            description="Both retrieval quality and patient ratings are depressed, pointing to outdated or insufficient clinical content.",
            action="Execute a full content refresh: crawl PubMed/CDC for all diseases, run Pre-RAG scoring, and purge documents below Tier 2.",
            impact="both",
            source_section="360° Analysis",
        ))

    if esc_total >= 5 and cqs < 75 and cqs > 0:
        recs.append(_rec(
            rec_id="cross-escalation-quality",
            category="cross_cutting",
            priority="high",
            title="Escalations correlate with low conversation quality",
            description="High escalation volume alongside low CQS means patients are not getting satisfactory AI answers before seeking human help.",
            action="Align Smart Routing thresholds with Quality Metrics: lower escalation triggers only after improving primary-agent content.",
            impact="both",
            source_section="360° Analysis",
        ))

    critical_alerts = [a for a in alerts if a.get("level") == "critical"]
    if critical_alerts and esc_total > 0:
        recs.append(_rec(
            rec_id="cross-alerts-escalation",
            category="cross_cutting",
            priority="critical",
            title="Critical alerts coincide with active escalations",
            description="System instability may be contributing to failed patient interactions and forced human handoffs.",
            action="Resolve critical infrastructure alerts first, then re-test the patient chat flow end-to-end before closing escalation cases.",
            impact="both",
            source_section="360° Analysis",
        ))

    if ragas_overall >= 80 and fb_avg >= 4.0 and cqs >= 80 and esc_total <= 2:
        recs.append(_rec(
            rec_id="cross-excellent",
            category="cross_cutting",
            priority="low",
            title="Portal performing well across all dimensions",
            description="RAGAS, feedback, quality, and escalations are all within healthy ranges.",
            action="Document current best practices, expand to additional disease areas, and consider A/B testing new patient portal features.",
            impact="both",
            source_section="360° Analysis",
        ))

    return recs


def _compute_scores(
    ragas: Dict,
    feedback: Dict,
    escalations: Dict,
    quality: Dict,
    alerts: List[Dict],
    recommendations: List[Dict],
) -> Dict:
    ragas_score = ragas.get("averages", {}).get("overall", 0)
    fb_score = (feedback.get("average_rating", 0) / 5 * 100) if feedback.get("total_ratings", 0) > 0 else 50
    cqs_score = quality.get("avg_cqs", 0) if quality.get("active_patients", 0) > 0 else 50

    esc_total = escalations.get("total_escalations", 0)
    esc_penalty = min(esc_total * 3, 30)
    esc_score = max(0, 100 - esc_penalty)

    alert_penalty = len([a for a in alerts if a.get("level") == "critical"]) * 10
    alert_penalty += len([a for a in alerts if a.get("level") == "warning"]) * 3
    alert_score = max(0, 100 - alert_penalty)

    portal_effectiveness = round(
        ragas_score * 0.30 + cqs_score * 0.25 + esc_score * 0.20 + alert_score * 0.15 + fb_score * 0.10,
        1,
    )
    patient_satisfaction = round(
        fb_score * 0.40 + cqs_score * 0.30 + ragas_score * 0.15 + esc_score * 0.15,
        1,
    )
    overall_health = round((portal_effectiveness + patient_satisfaction) / 2, 1)

    critical_count = sum(1 for r in recommendations if r["priority"] == "critical")
    high_count = sum(1 for r in recommendations if r["priority"] == "high")

    if overall_health >= 85:
        health_label = "Excellent"
        health_color = "#34D399"
    elif overall_health >= 70:
        health_label = "Good"
        health_color = "#60A5FA"
    elif overall_health >= 55:
        health_label = "Needs Improvement"
        health_color = "#FBBF24"
    else:
        health_label = "Critical"
        health_color = "#F05252"

    return {
        "portal_effectiveness": portal_effectiveness,
        "patient_satisfaction": patient_satisfaction,
        "overall_health": overall_health,
        "health_label": health_label,
        "health_color": health_color,
        "dimension_scores": {
            "ragas": round(ragas_score, 1),
            "feedback": round(fb_score, 1),
            "quality_cqs": round(cqs_score, 1),
            "escalations": round(esc_score, 1),
            "alerts": round(alert_score, 1),
        },
        "action_summary": {
            "total_recommendations": len(recommendations),
            "critical": critical_count,
            "high": high_count,
            "medium": sum(1 for r in recommendations if r["priority"] == "medium"),
            "low": sum(1 for r in recommendations if r["priority"] == "low"),
        },
    }


async def _fetch_alerts(db) -> List[Dict]:
    from sqlalchemy import desc, select
    from backend.database.models import SystemAlert

    res = await db.execute(
        select(SystemAlert)
        .where(SystemAlert.resolved == False)
        .order_by(desc(SystemAlert.created_at))
        .limit(100)
    )
    alerts = res.scalars().all()
    return [
        {
            "id": a.id,
            "level": a.level or "info",
            "title": a.title or "Alert",
            "message": a.message or "",
            "component": a.component or "System",
            "created_at": a.created_at.isoformat() if a.created_at else "",
        }
        for a in alerts
    ]


async def get_recommendations_360(db, days: int = HISTORY_DAYS) -> Dict:
    """Synthesize all admin metric sources into prioritized recommendations."""
    # Sequential fetches — one AsyncSession cannot run concurrent queries.
    ragas = await get_ragas_metrics(db, days)
    feedback = await get_patient_feedback(db, days)
    escalations = await get_escalations(db, days)
    quality = await get_quality_summary(db, days)
    alerts = await _fetch_alerts(db)

    recommendations: List[Dict] = []
    recommendations.extend(_generate_ragas_recommendations(ragas))
    recommendations.extend(_generate_feedback_recommendations(feedback))
    recommendations.extend(_generate_alert_recommendations(alerts))
    recommendations.extend(_generate_escalation_recommendations(escalations))
    recommendations.extend(_generate_quality_recommendations(quality))
    recommendations.extend(_generate_cross_cutting_recommendations(
        ragas, feedback, escalations, quality, alerts,
    ))

    recommendations.sort(key=lambda r: _priority_rank(r["priority"]))

    scores = _compute_scores(ragas, feedback, escalations, quality, alerts, recommendations)

    by_category: Dict[str, List[Dict]] = {}
    for rec in recommendations:
        by_category.setdefault(rec["category"], []).append(rec)

    return {
        "refreshed_at": datetime.utcnow().isoformat(),
        "period_days": days,
        "scores": scores,
        "recommendations": recommendations,
        "by_category": by_category,
        "source_snapshots": {
            "ragas": {
                "overall": ragas.get("averages", {}).get("overall", 0),
                "total_evaluations": ragas.get("total_evaluations", 0),
            },
            "feedback": {
                "average_rating": feedback.get("average_rating", 0),
                "total_ratings": feedback.get("total_ratings", 0),
            },
            "alerts": {
                "unresolved": len(alerts),
                "critical": len([a for a in alerts if a.get("level") == "critical"]),
            },
            "escalations": {
                "total": escalations.get("total_escalations", 0),
                "human": escalations.get("human_escalations", 0),
                "specialist": escalations.get("specialist_escalations", 0),
            },
            "quality": {
                "avg_cqs": quality.get("avg_cqs", 0),
                "active_patients": quality.get("active_patients", 0),
                "dimensions": quality.get("dimensions", {}),
            },
        },
    }
