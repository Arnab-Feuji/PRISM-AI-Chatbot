import React, { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import {
  Target, RefreshCw, AlertTriangle, CheckCircle2, TrendingUp,
  MessageSquare, Bell, Activity, Shield, Lightbulb, ArrowRight,
  Heart, Zap, ChevronDown, ChevronRight, Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { parseUtcDate } from "../utils/datetime";

const PRIORITY_STYLES = {
  critical: { color: "#F05252", bg: "#F0525218", label: "Critical" },
  high:     { color: "#F97316", bg: "#F9731618", label: "High" },
  medium:   { color: "#FBBF24", bg: "#FBBF2418", label: "Medium" },
  low:      { color: "#34D399", bg: "#34D39918", label: "Low" },
};

const CATEGORY_META = {
  ragas:         { label: "RAGAS Metrics",       icon: TrendingUp,    color: "#EC4899" },
  feedback:      { label: "Patient Feedback",    icon: MessageSquare, color: "#34D399" },
  alerts:        { label: "Alerts",              icon: Bell,          color: "#F05252" },
  escalations:   { label: "Escalations",         icon: Activity,      color: "#F97316" },
  quality:       { label: "Quality Metrics",     icon: Shield,        color: "#60A5FA" },
  cross_cutting: { label: "360° Cross-Analysis", icon: Target,        color: "#A78BFA" },
};

const IMPACT_LABELS = {
  patient_satisfaction: "Patient Satisfaction",
  portal_effectiveness: "Portal Effectiveness",
  both: "Satisfaction & Effectiveness",
};

const CARD_TIPS = {
  overall_health: "Composite health score (0–100) blending RAGAS, patient feedback, quality (CQS), escalations, and alerts. Color reflects status: green = healthy, amber = needs attention, red = critical.",
  portal_effectiveness: "How well the AI portal performs technically for patients. Weighted blend: RAGAS 30%, Clinical Quality Score 25%, escalations 20%, alerts 15%, and feedback 10%. Higher scores mean more reliable, accurate AI responses.",
  patient_satisfaction: "Perceived patient experience based on ratings, quality scores, and escalation burden. Weighted: feedback 40%, CQS 30%, RAGAS 15%, escalations 15%. Tracks whether patients feel heard and supported.",
  action_summary: "Count of generated recommendations grouped by urgency. Use this to prioritize admin work for the week.",
  action_total: "Total actionable recommendations synthesized from all admin data sources in the current period.",
  action_critical: "Recommendations requiring immediate attention — unresolved critical alerts, severe quality drops, or safety-related issues.",
  action_high: "Important improvements that should be addressed soon to prevent patient experience or portal performance decline.",
  action_medium: "Moderate-priority optimizations — address after critical and high items are resolved.",
  recommendations_by_source: "Bar chart showing how many recommendations originated from each data source (RAGAS, feedback, alerts, escalations, quality, cross-analysis). Helps identify which area needs the most admin focus.",
  ragas_overall: "Average composite RAGAS score across all AI answer evaluations in the period. Measures retrieval and generation quality of clinical responses.",
  avg_rating: "Mean star rating from patient feedback submissions. Direct signal of perceived answer helpfulness and empathy.",
  alerts: "Count of open system alerts (infrastructure, LLM, guardrails). Includes critical items that may affect portal availability or answer quality.",
  escalations: "Total specialist and human escalations triggered when AI confidence is low or patient frustration is high.",
  avg_cqs: "Average Clinical Quality Score across monitored patients — combines engagement, adherence signals, and interaction quality.",
};

function TooltipUI({ title, content, children, inline = false }) {
  if (!content) return children;
  const tooltipId = useMemo(() => `tip-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <div
      className="tooltip-container"
      id={tooltipId}
      style={{ position: "relative", display: "inline-block", width: inline ? "auto" : "100%", cursor: "help" }}
    >
      <style>{`
        #${tooltipId}:hover .executive-tooltip {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateX(-50%) translateY(0) !important;
        }
      `}</style>
      {children}
      <div
        className="executive-tooltip"
        style={{
          position: "absolute",
          top: "calc(100% + 12px)",
          left: "50%",
          transform: "translateX(-50%) translateY(-10px)",
          zIndex: 2147483647,
          width: "280px",
          padding: "16px",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          boxShadow: "0 12px 32px rgba(16, 38, 67, 0.14)",
          textAlign: "left",
          pointerEvents: "none",
          opacity: 0,
          visibility: "hidden",
          transition: "all 0.2s ease-out",
        }}
      >
        <div className="executive-tooltip-arrow" style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", border: "8px solid transparent", borderBottomColor: "var(--bg-card)" }} />
        <div className="executive-tooltip-title" style={{ fontSize: "9px", fontWeight: "900", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "6px", borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>
          {title || "Metric Insights"}
        </div>
        <div className="executive-tooltip-body" style={{ fontSize: "11px", color: "var(--text-main)", lineHeight: "1.5", fontWeight: "500" }}>
          {content}
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const s = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}40` }}
    >
      {s.label}
    </span>
  );
}

function ScoreRing({ value, label, color, size = 120 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-black" style={{ color }}>{value}</span>
        <span className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}

function RecommendationCard({ rec, expanded, onToggle }) {
  const cat = CATEGORY_META[rec.category] || CATEGORY_META.cross_cutting;
  const CatIcon = cat.icon;
  return (
    <div
      className="bg-[var(--bg-card)] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all"
      style={{ borderLeft: `3px solid ${PRIORITY_STYLES[rec.priority]?.color || "#60A5FA"}` }}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-5 flex items-start gap-4"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: cat.color + "20", color: cat.color }}
        >
          <CatIcon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <PriorityBadge priority={rec.priority} />
            <span className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
              {rec.source_section}
            </span>
            {rec.metric_value != null && rec.threshold != null && (
              <span className="text-[9px] font-mono text-[var(--text-dim)]">
                {rec.metric_value} / {rec.threshold}
              </span>
            )}
          </div>
          <h3 className="font-bold text-sm text-[var(--text-main)] leading-snug">{rec.title}</h3>
          <p className="text-[11px] text-[var(--text-dim)] mt-1 line-clamp-2">{rec.description}</p>
        </div>
        <div className="flex-shrink-0 text-[var(--text-dim)] mt-1">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-5 pt-0 border-t border-white/5">
          <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={14} className="text-[var(--accent)]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent)]">
                Recommended Action
              </span>
            </div>
            <p className="text-[12px] text-[var(--text-main)] leading-relaxed">{rec.action}</p>
          </div>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="text-[9px] font-bold text-[var(--text-dim)] uppercase">Impact:</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                color: rec.impact === "patient_satisfaction" ? "#34D399" : rec.impact === "portal_effectiveness" ? "#60A5FA" : "#A78BFA",
                background: "rgba(255,255,255,0.05)",
              }}
            >
              {IMPACT_LABELS[rec.impact] || rec.impact}
            </span>
            {rec.related_entity && (
              <span className="text-[9px] font-mono text-[var(--text-dim)]">
                Entity: {rec.related_entity}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminRecommendation360() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/recommendations/360");
      setData(res.data);
      toast.success("360° recommendations refreshed");
    } catch {
      toast.error("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-[var(--text-dim)]">
        <AlertTriangle size={32} className="mx-auto mb-3 text-[var(--warning)]" />
        <p>Unable to load 360° recommendations.</p>
        <button onClick={fetchData} className="mt-4 text-[var(--accent)] text-sm font-bold hover:underline">
          Retry
        </button>
      </div>
    );
  }

  const { scores, recommendations, source_snapshots: snap } = data;

  const filtered = recommendations.filter((r) => {
    if (filterPriority !== "all" && r.priority !== filterPriority) return false;
    if (filterCategory !== "all" && r.category !== filterCategory) return false;
    return true;
  });

  const barData = Object.entries(CATEGORY_META).map(([key, meta]) => ({
    name: meta.label.split(" ")[0],
    count: recommendations.filter((r) => r.category === key).length,
    color: meta.color,
  })).filter((d) => d.count > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-disp font-bold text-xl flex items-center gap-2">
            <Target size={22} className="text-[var(--accent)]" />
            Recommendation 360° View
          </h2>
          <p className="text-[var(--text-dim)] text-sm mt-1 max-w-2xl">
            Actionable insights synthesized from RAGAS metrics, patient feedback, alerts,
            escalations, and quality scores — designed to boost portal effectiveness and patient satisfaction.
          </p>
          <p className="text-[10px] font-mono text-[var(--text-dim)] mt-2">
            Last refreshed: {parseUtcDate(data.refreshed_at)?.toLocaleString() ?? "—"} · {data.period_days}-day window
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 text-[11px] font-bold border border-white/10 px-4 py-2 rounded-full hover:bg-white/5 transition-all text-[var(--text-dim)] hover:text-[var(--text-main)]"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TooltipUI title="Overall Health" content={CARD_TIPS.overall_health}>
          <div className="bg-[var(--bg-card)] border border-white/5 rounded-2xl p-6 flex flex-col items-center relative">
            <div className="relative">
              <ScoreRing value={scores.overall_health} label="Overall Health" color={scores.health_color} />
            </div>
            <span
              className="mt-3 text-sm font-black uppercase tracking-wider"
              style={{ color: scores.health_color }}
            >
              {scores.health_label}
            </span>
          </div>
        </TooltipUI>

        <TooltipUI title="Portal Effectiveness" content={CARD_TIPS.portal_effectiveness}>
          <div className="bg-[var(--bg-card)] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-[#60A5FA]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                Portal Effectiveness
              </span>
            </div>
            <div className="text-4xl font-black text-[#60A5FA] mb-2">{scores.portal_effectiveness}</div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${scores.portal_effectiveness}%`, background: "#60A5FA" }}
              />
            </div>
            <p className="text-[10px] text-[var(--text-dim)] mt-3">
              Weighted: RAGAS 30% · CQS 25% · Escalations 20% · Alerts 15% · Feedback 10%
            </p>
          </div>
        </TooltipUI>

        <TooltipUI title="Patient Satisfaction" content={CARD_TIPS.patient_satisfaction}>
          <div className="bg-[var(--bg-card)] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Heart size={16} className="text-[#34D399]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                Patient Satisfaction
              </span>
            </div>
            <div className="text-4xl font-black text-[#34D399] mb-2">{scores.patient_satisfaction}</div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${scores.patient_satisfaction}%`, background: "#34D399" }}
              />
            </div>
            <p className="text-[10px] text-[var(--text-dim)] mt-3">
              Weighted: Feedback 40% · CQS 30% · RAGAS 15% · Escalations 15%
            </p>
          </div>
        </TooltipUI>
      </div>

      {/* Action summary + charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
              Action Summary
            </h3>
            <TooltipUI title="Action Summary" content={CARD_TIPS.action_summary} inline>
              <span className="inline-flex items-center text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors">
                <Info size={12} />
              </span>
            </TooltipUI>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total", value: scores.action_summary.total_recommendations, color: "var(--accent)", tip: CARD_TIPS.action_total },
              { label: "Critical", value: scores.action_summary.critical, color: "#F05252", tip: CARD_TIPS.action_critical },
              { label: "High", value: scores.action_summary.high, color: "#F97316", tip: CARD_TIPS.action_high },
              { label: "Medium", value: scores.action_summary.medium, color: "#FBBF24", tip: CARD_TIPS.action_medium },
            ].map((item) => (
              <TooltipUI key={item.label} title={item.label} content={item.tip}>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center h-full">
                  <div className="text-xl font-black" style={{ color: item.color }}>{item.value}</div>
                  <div className="text-[9px] font-bold text-[var(--text-dim)] uppercase">{item.label}</div>
                </div>
              </TooltipUI>
            ))}
          </div>
        </div>

        <TooltipUI title="Recommendations by Source" content={CARD_TIPS.recommendations_by_source}>
          <div className="bg-[var(--bg-card)] border border-white/5 rounded-2xl p-5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-2">
              Recommendations by Source
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: "var(--text-dim)", fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "var(--text-dim)", fontSize: 9 }} width={70} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TooltipUI>
      </div>

      {/* Source snapshots */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "RAGAS Overall", value: `${snap.ragas.overall}%`, sub: `${snap.ragas.total_evaluations} evals`, icon: TrendingUp, color: "#EC4899", tip: CARD_TIPS.ragas_overall },
          { label: "Avg Rating", value: `${snap.feedback.average_rating}/5`, sub: `${snap.feedback.total_ratings} ratings`, icon: MessageSquare, color: "#34D399", tip: CARD_TIPS.avg_rating },
          { label: "Alerts", value: snap.alerts.unresolved, sub: `${snap.alerts.critical} critical`, icon: Bell, color: "#F05252", tip: CARD_TIPS.alerts },
          { label: "Escalations", value: snap.escalations.total, sub: `${snap.escalations.human} human`, icon: Activity, color: "#F97316", tip: CARD_TIPS.escalations },
          { label: "Avg CQS", value: snap.quality.avg_cqs, sub: `${snap.quality.active_patients} patients`, icon: Shield, color: "#60A5FA", tip: CARD_TIPS.avg_cqs },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <TooltipUI key={item.label} title={item.label} content={item.tip}>
              <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} style={{ color: item.color }} />
                  <span className="text-[9px] font-bold text-[var(--text-dim)] uppercase">{item.label}</span>
                </div>
                <div className="text-lg font-black" style={{ color: item.color }}>{item.value}</div>
                <div className="text-[9px] text-[var(--text-dim)]">{item.sub}</div>
              </div>
            </TooltipUI>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase">Filter:</span>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-[var(--bg-card)] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-[var(--text-main)]"
        >
          <option value="all">All Priorities</option>
          {Object.entries(PRIORITY_STYLES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-[var(--bg-card)] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-[var(--text-main)]"
        >
          <option value="all">All Sources</option>
          {Object.entries(CATEGORY_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <span className="text-[10px] text-[var(--text-dim)] ml-auto">
          Showing {filtered.length} of {recommendations.length} recommendations
        </span>
      </div>

      {/* Recommendation list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-[var(--bg-card)] border border-white/5 rounded-2xl">
            <CheckCircle2 size={32} className="mx-auto mb-3 text-[#34D399]" />
            <p className="text-[var(--text-dim)] text-sm">No recommendations match the current filters.</p>
          </div>
        ) : (
          filtered.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              expanded={!!expanded[rec.id]}
              onToggle={() => toggleExpand(rec.id)}
            />
          ))
        )}
      </div>

      {/* Quick wins panel */}
      {scores.action_summary.critical + scores.action_summary.high > 0 && (
        <div className="bg-gradient-to-r from-[var(--accent)]/10 to-transparent border border-[var(--accent)]/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight size={16} className="text-[var(--accent)]" />
            <h3 className="font-bold text-sm text-[var(--accent)]">Top Priority Actions This Week</h3>
          </div>
          <ol className="space-y-2">
            {recommendations
              .filter((r) => r.priority === "critical" || r.priority === "high")
              .slice(0, 5)
              .map((rec, i) => (
                <li key={rec.id} className="flex items-start gap-3 text-[12px]">
                  <span className="font-black text-[var(--accent)] w-5 flex-shrink-0">{i + 1}.</span>
                  <span className="text-[var(--text-main)]">
                    <strong>{rec.title}</strong>
                    <span className="text-[var(--text-dim)]"> — {rec.action}</span>
                  </span>
                </li>
              ))}
          </ol>
        </div>
      )}

      <div className="flex items-start gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/5">
        <Info size={14} className="text-[var(--text-dim)] flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-[var(--text-dim)] leading-relaxed">
          Recommendations are generated from live data across all admin portal sections.
          Portal Effectiveness measures how well the AI system serves patients technically;
          Patient Satisfaction measures perceived experience from ratings, quality, and escalation burden.
          Review weekly and track score trends after implementing actions.
        </p>
      </div>
    </div>
  );
}
