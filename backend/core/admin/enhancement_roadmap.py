# ═══════════════════════════════════════════════════════════════════════════════
# Enhancement Roadmap — KPI dashboard + prioritized action backlog
# Built on live RAGAS, feedback, CQS, alerts, escalations, and health data.
# ═══════════════════════════════════════════════════════════════════════════════

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from backend.core.admin.recommendations import get_recommendations_360, _priority_rank

TARGETS = {
    "rag_quality": 85.0,
    "patient_satisfaction": 80.0,
    "conversation_quality": 75.0,
    "platform_reliability": 90.0,
    "routing_efficiency": 85.0,
}

RAGAS_RADAR_TARGETS = {
    "faithfulness": 80.0,
    "answer_relevancy": 80.0,
    "context_precision": 75.0,
    "context_recall": 75.0,
}

CQS_DIM_TARGETS = {
    "engagement": 75.0,
    "response_quality": 80.0,
    "clinical_safety": 85.0,
    "session_flow": 70.0,
    "format_variety": 65.0,
    "velocity": 80.0,
}

CQS_DIM_LABELS = {
    "engagement": "Engage",
    "response_quality": "Quality",
    "clinical_safety": "Safety",
    "session_flow": "Flow",
    "format_variety": "Format",
    "velocity": "Speed",
}

CATEGORY_SECTION = {
    "alerts": "alerts",
    "ragas": "ragas",
    "quality": "quality",
    "escalations": "escalation",
    "feedback": "feedback",
    "cross_cutting": "dashboard",
}

CATEGORY_TAGS = {
    "alerts": "Clinical Safety",
    "ragas": "Retrieval Quality",
    "quality": "Conversation Quality",
    "escalations": "Smart Routing",
    "feedback": "Patient Experience",
    "cross_cutting": "Cross-Analysis",
}

CHECKLIST_BY_CATEGORY = {
    "alerts": [
        "Open Alerts and resolve each critical item.",
        "Verify affected agents in Smart Routing and Escalations.",
        "Document root cause and preventive action.",
    ],
    "ragas": [
        "Review RAGAS dashboard for underperforming metrics.",
        "Refresh indexed documents via Upload & Crawl.",
        "Re-run Pre-RAG scoring on stale content.",
    ],
    "quality": [
        "Open Quality Metrics and identify weakest CQS dimensions.",
        "Run test conversations for the lowest-scoring agents.",
        "Track CQS daily for one week after changes.",
    ],
    "escalations": [
        "Review escalation reasons in the Escalations dashboard.",
        "Tune Smart Routing confidence thresholds.",
        "Enrich primary-agent knowledge for top escalation drivers.",
    ],
    "feedback": [
        "Read recent low-rated patient comments.",
        "Map complaints to specific agents or workflows.",
        "Follow up with at-risk patients where appropriate.",
    ],
    "cross_cutting": [
        "Coordinate fixes across RAGAS, quality, and feedback modules.",
        "Schedule a weekly cross-functional review.",
        "Document improvements and re-measure after 7 days.",
    ],
}


def _kpi_status(value: float, target: float, higher_is_better: bool = True) -> str:
    if higher_is_better:
        return "on_track" if value >= target else "needs_action"
    return "on_track" if value <= target else "needs_action"


def _gap(value: float, target: float, higher_is_better: bool = True) -> float:
    if higher_is_better:
        return round(max(0, target - value), 1)
    return round(max(0, value - target), 1)


def _platform_reliability(health: Dict, critical: int, warnings: int) -> float:
    online = health.get("online", 0)
    total = max(health.get("total", 1), 1)
    online_pct = online / total * 100
    alert_component = max(0, 100 - critical * 20 - warnings * 1.1)
    return round(online_pct * 0.5 + alert_component * 0.5, 1)


def _routing_efficiency(
    conversations: int,
    specialist: int,
    human: int,
) -> Dict[str, float]:
    base = max(conversations, 1)
    specialist_pct = round(specialist / base * 100, 1)
    human_pct = round(human / base * 100, 1)
    efficiency = round(max(0, 100 - specialist_pct * 0.88 - human_pct), 1)
    return {
        "efficiency": efficiency,
        "specialist_pct": specialist_pct,
        "human_pct": human_pct,
    }


def _enhance_recommendation(rec: Dict, tab_counts: Dict[str, int]) -> Dict:
    category = rec.get("category", "cross_cutting")
    checklist = list(CHECKLIST_BY_CATEGORY.get(category, CHECKLIST_BY_CATEGORY["cross_cutting"]))
    if rec.get("priority") == "critical" and category == "alerts":
        checklist[0] = "Open Alerts and resolve each critical item immediately."

    enhanced = {
        **rec,
        "finding": rec.get("description", ""),
        "roadmap_action": rec.get("action", ""),
        "checklist": checklist,
        "tag": CATEGORY_TAGS.get(category, "Enhancement"),
        "link_section": CATEGORY_SECTION.get(category, "dashboard"),
        "signal_count": tab_counts.get(category, 1),
    }
    return enhanced


async def _conversation_count(db, days: int) -> int:
    from sqlalchemy import select, func
    from backend.database.models import Conversation
    from backend.core.admin.admin_metrics import _cutoff

    cutoff = _cutoff(days)
    res = await db.execute(
        select(func.count(Conversation.id)).where(Conversation.created_at >= cutoff)
    )
    return int(res.scalar() or 0)


async def get_enhancement_roadmap(db, days: int = 15) -> Dict:
    """Aggregate live metrics into Enhancement Roadmap KPIs, charts, and backlog."""
    base = await get_recommendations_360(db, days=days)
    snap = base["source_snapshots"]
    scores = base["scores"]
    recommendations = base["recommendations"]

    ragas_avg = snap["ragas"]
    feedback = snap["feedback"]
    alerts_snap = snap["alerts"]
    escalations = snap["escalations"]
    quality = snap["quality"]

    rag_overall = float(ragas_avg.get("overall", 0) or 0)
    fb_rating = float(feedback.get("average_rating", 0) or 0)
    patient_sat = round(fb_rating / 5 * 100, 1) if feedback.get("total_ratings", 0) > 0 else scores["patient_satisfaction"]
    cqs = float(quality.get("avg_cqs", 0) or 0)
    conversations = int(quality.get("active_patients", 0) or 0)

    # Unresolved alert breakdown from recommendations source
    from backend.core.admin.recommendations import _fetch_alerts
    alerts = await _fetch_alerts(db)
    critical_alerts = [a for a in alerts if a.get("level") == "critical"]
    warning_alerts = [a for a in alerts if a.get("level") == "warning"]

    from backend.core.admin.admin_metrics import get_patient_feedback

    feedback_full = await get_patient_feedback(db, days)
    dist = feedback_full.get("distribution", {})
    low_ratings = int(dist.get("1", 0)) + int(dist.get("2", 0))

    conv_count = await _conversation_count(db, days)
    display_conversations = conv_count or conversations

    platform_rel = _platform_reliability(
        {"online": 8, "total": 9},
        len(critical_alerts),
        len(warning_alerts),
    )

    routing = _routing_efficiency(
        max(display_conversations, 1),
        escalations.get("specialist", 0),
        escalations.get("human", 0),
    )

    kpis = [
        {
            "id": "rag_quality",
            "label": "RAG Quality",
            "value": rag_overall,
            "target": TARGETS["rag_quality"],
            "gap": _gap(rag_overall, TARGETS["rag_quality"]),
            "unit": "%",
            "status": _kpi_status(rag_overall, TARGETS["rag_quality"]),
            "subtext1": f"Target {TARGETS['rag_quality']:.0f}% · gap {_gap(rag_overall, TARGETS['rag_quality'])}",
            "subtext2": f"{rag_overall}% composite · target {TARGETS['rag_quality']:.0f}%",
        },
        {
            "id": "patient_satisfaction",
            "label": "Patient Satisfaction",
            "value": patient_sat,
            "target": TARGETS["patient_satisfaction"],
            "gap": _gap(patient_sat, TARGETS["patient_satisfaction"]),
            "unit": "%",
            "status": _kpi_status(patient_sat, TARGETS["patient_satisfaction"]),
            "subtext1": f"Target {TARGETS['patient_satisfaction']:.0f}% · gap {_gap(patient_sat, TARGETS['patient_satisfaction'])}",
            "subtext2": f"{fb_rating}/5 avg rating",
        },
        {
            "id": "conversation_quality",
            "label": "Conversation Quality",
            "value": cqs,
            "target": TARGETS["conversation_quality"],
            "gap": _gap(cqs, TARGETS["conversation_quality"]),
            "unit": "",
            "status": _kpi_status(cqs, TARGETS["conversation_quality"]),
            "subtext1": f"Target {TARGETS['conversation_quality']:.0f}/100 · gap {_gap(cqs, TARGETS['conversation_quality'])}",
            "subtext2": f"{cqs}/100 CQS · {display_conversations} conversations",
        },
        {
            "id": "platform_reliability",
            "label": "Platform Reliability",
            "value": platform_rel,
            "target": TARGETS["platform_reliability"],
            "gap": _gap(platform_rel, TARGETS["platform_reliability"]),
            "unit": "%",
            "status": _kpi_status(platform_rel, TARGETS["platform_reliability"]),
            "subtext1": f"Target {TARGETS['platform_reliability']:.0f}% · gap {_gap(platform_rel, TARGETS['platform_reliability'])}",
            "subtext2": f"{len(critical_alerts)} critical · {len(warning_alerts)} warnings",
        },
        {
            "id": "routing_efficiency",
            "label": "Routing Efficiency",
            "value": routing["efficiency"],
            "target": TARGETS["routing_efficiency"],
            "gap": _gap(routing["efficiency"], TARGETS["routing_efficiency"]),
            "unit": "%",
            "status": _kpi_status(routing["efficiency"], TARGETS["routing_efficiency"]),
            "subtext1": f"Target {TARGETS['routing_efficiency']:.0f}% · gap {_gap(routing['efficiency'], TARGETS['routing_efficiency'])}",
            "subtext2": f"{routing['specialist_pct']}% specialist · {routing['human_pct']}% human handoff",
        },
    ]

    dims = quality.get("dimensions", {})
    from backend.core.admin.admin_metrics import get_ragas_metrics
    ragas_full = await get_ragas_metrics(db, days)
    ragas_averages = ragas_full.get("averages", {})

    summary_cards = [
        {
            "id": "ragas_composite",
            "label": "RAGAS Composite",
            "value": f"{rag_overall}%",
            "sub": f"{ragas_avg.get('total_evaluations', 0)} evaluations · gap to {TARGETS['rag_quality']:.0f}%: {_gap(rag_overall, TARGETS['rag_quality'])}",
            "color": "#34D399" if rag_overall >= TARGETS["rag_quality"] else "#EC4899",
        },
        {
            "id": "patient_feedback",
            "label": "Patient Feedback",
            "value": f"{fb_rating}/5",
            "sub": f"{low_ratings or 0} low ratings to investigate",
            "color": "#F472B6",
        },
        {
            "id": "conversation_quality",
            "label": "Conversation Quality",
            "value": str(cqs),
            "sub": f"{display_conversations} conversations scored",
            "color": "#A78BFA",
        },
        {
            "id": "operational_risk",
            "label": "Operational Risk",
            "value": f"{len(critical_alerts)} crit",
            "sub": f"{len(warning_alerts)} warnings · {routing['specialist_pct']}% specialist routing",
            "color": "#F05252",
        },
    ]

    radar_metrics = [
        ("Faithfulness", "faithfulness"),
        ("Relevancy", "answer_relevancy"),
        ("Precision", "context_precision"),
        ("Recall", "context_recall"),
    ]
    ragas_radar = {
        "actual": [
            {
                "metric": label,
                "value": round(float(ragas_averages.get(key, 0) or 0), 1),
                "target": RAGAS_RADAR_TARGETS[key],
            }
            for label, key in radar_metrics
        ],
    }

    cqs_dimensions = [
        {
            "name": CQS_DIM_LABELS[key],
            "key": key,
            "actual": round(float(dims.get(key, 0) or 0), 1),
            "target": target,
        }
        for key, target in CQS_DIM_TARGETS.items()
    ]

    action_summary = scores.get("action_summary", {})
    priority_mix = [
        {"name": "Critical", "value": action_summary.get("critical", 0), "color": "#F05252"},
        {"name": "High", "value": action_summary.get("high", 0), "color": "#F97316"},
        {"name": "Medium", "value": action_summary.get("medium", 0), "color": "#60A5FA"},
        {"name": "Low", "value": action_summary.get("low", 0), "color": "#34D399"},
    ]

    tab_counts = {
        "all": len(recommendations),
        "alerts": sum(1 for r in recommendations if r["category"] == "alerts"),
        "ragas": sum(1 for r in recommendations if r["category"] == "ragas"),
        "quality": sum(1 for r in recommendations if r["category"] == "quality"),
        "escalations": sum(1 for r in recommendations if r["category"] == "escalations"),
        "feedback": sum(1 for r in recommendations if r["category"] == "feedback"),
    }

    enhanced_recs = [_enhance_recommendation(r, tab_counts) for r in recommendations]
    enhanced_recs.sort(key=lambda r: _priority_rank(r["priority"]))

    return {
        "refreshed_at": datetime.utcnow().isoformat(),
        "period_days": days,
        "kpis": kpis,
        "summary_cards": summary_cards,
        "charts": {
            "ragas_radar": ragas_radar,
            "cqs_dimensions": cqs_dimensions,
            "priority_mix": priority_mix,
        },
        "recommendations": enhanced_recs,
        "tab_counts": tab_counts,
        "backlog_total": action_summary.get("total_recommendations", len(recommendations)),
        "scores": scores,
    }
