import React, { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import {
  ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie,
} from "recharts";
import {
  Map, RefreshCw, AlertTriangle, TrendingUp, MessageSquare,
  Target, Bell, Activity, Shield, CheckCircle2, ArrowRight, Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { parseUtcDate } from "../utils/datetime";

const PRIORITY_STYLES = {
  critical: { color: "#F05252", bg: "#F0525220", label: "CRITICAL" },
  high:     { color: "#F97316", bg: "#F9731620", label: "HIGH" },
  medium:   { color: "#60A5FA", bg: "#60A5FA20", label: "MEDIUM" },
  low:      { color: "#34D399", bg: "#34D39920", label: "LOW" },
};

const CATEGORY_META = {
  alerts:      { label: "ALERTS", icon: Bell, color: "#F05252" },
  ragas:       { label: "RAGAS METRICS", icon: TrendingUp, color: "#EC4899" },
  quality:     { label: "QUALITY METRICS", icon: Shield, color: "#60A5FA" },
  escalations: { label: "ESCALATIONS", icon: Activity, color: "#F97316" },
  feedback:    { label: "PATIENT FEEDBACK", icon: MessageSquare, color: "#34D399" },
  cross_cutting: { label: "CROSS-ANALYSIS", icon: Target, color: "#A78BFA" },
};

const SUMMARY_ICONS = {
  ragas_composite: TrendingUp,
  patient_feedback: MessageSquare,
  conversation_quality: Target,
  operational_risk: AlertTriangle,
};

const TABS = [
  { id: "all", label: "All Recommendations" },
  { id: "alerts", label: "Alerts" },
  { id: "ragas", label: "RAGAS Metrics" },
  { id: "quality", label: "Quality Metrics" },
  { id: "escalations", label: "Escalations" },
  { id: "feedback", label: "Patient Feedback" },
];

const DIM_COLORS = {
  Safety: "#F05252",
  Flow: "#34D399",
  Engage: "#F97316",
  Quality: "#F97316",
  Format: "#F97316",
  Speed: "#F97316",
};

const KPI_TIPS = {
  rag_quality:
    "Composite RAGAS retrieval quality across faithfulness, relevancy, precision, and recall. Target 85% means AI answers are well-grounded in indexed clinical evidence.",
  patient_satisfaction:
    "Patient satisfaction score derived from star ratings (scaled to 100%). Target 80% indicates patients feel heard, supported, and satisfied with AI responses.",
  conversation_quality:
    "Average Conversation Quality Score (CQS) across scored sessions. Combines engagement, response quality, safety, flow, format, and speed dimensions.",
  platform_reliability:
    "Infrastructure health blended with unresolved alert burden. Critical and warning alerts reduce reliability — resolve them to restore patient-facing uptime.",
  routing_efficiency:
    "How often primary agents resolve queries without specialist or human escalation. Lower specialist and human handoff rates improve routing efficiency.",
};

const CHART_TIPS = {
  ragas_radar:
    "Spider chart comparing live RAGAS dimension scores (green) against admin targets (orange dashed). Gaps highlight which retrieval metrics need content or pipeline fixes.",
  cqs_dimensions:
    "Grouped bars show each CQS dimension score vs its target. Red Safety or low Flow bars signal friction or clinical-risk areas to prioritize in the roadmap.",
  priority_mix:
    "Donut breakdown of open roadmap items by urgency. Use Critical and High segments to plan weekly admin work before medium and low optimizations.",
};

const SUMMARY_TIPS = {
  ragas_composite:
    "Headline RAGAS composite from live evaluations in the monitoring window. Gap to 85% shows how far retrieval quality is from the admin target.",
  patient_feedback:
    "Mean patient star rating with count of low (1–2 star) ratings flagged for investigation. Direct signal of perceived helpfulness and empathy.",
  conversation_quality:
    "Aggregate CQS across conversations scored in the period. Falling scores often correlate with escalations and negative feedback.",
  operational_risk:
    "Unresolved critical alerts plus warning volume and specialist routing share. Elevated risk means triage alerts before further portal changes.",
};

const TAB_TIPS = {
  all: "Full prioritized backlog across alerts, RAGAS, quality, escalations, and patient feedback.",
  alerts: "Roadmap items tied to unresolved system alerts, guardrails, and infrastructure warnings.",
  ragas: "Items addressing faithfulness, relevancy, precision, recall, and per-agent retrieval gaps.",
  quality: "CQS dimension improvements — engagement, safety, session flow, and response quality.",
  escalations: "Specialist and human handoff reductions via Smart Routing and content enrichment.",
  feedback: "Patient rating trends, low-star investigations, and satisfaction recovery actions.",
};

function TooltipUI({ title, content, children, inline = false }) {
  if (!content) return children;
  const tooltipId = useMemo(() => `roadmap-tip-${Math.random().toString(36).slice(2, 9)}`, []);

  return (
    <div
      className="tooltip-container"
      id={tooltipId}
      style={{ position: "relative", display: inline ? "inline-block" : "block", width: inline ? "auto" : "100%", cursor: "help" }}
    >
      <style>{`
        #${tooltipId}:hover .roadmap-tooltip {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateX(-50%) translateY(0) !important;
        }
      `}</style>
      {children}
      <div
        className="roadmap-tooltip"
        style={{
          position: "absolute",
          top: "calc(100% + 10px)",
          left: "50%",
          transform: "translateX(-50%) translateY(-8px)",
          zIndex: 2147483647,
          width: "280px",
          padding: "14px 16px",
          backgroundColor: "#0F172A",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "14px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.85)",
          textAlign: "left",
          pointerEvents: "none",
          opacity: 0,
          visibility: "hidden",
          transition: "all 0.2s ease-out",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            border: "7px solid transparent",
            borderBottomColor: "#0F172A",
          }}
        />
        {title && (
          <div
            style={{
              fontSize: "9px",
              fontWeight: 900,
              color: "#FFFFFF",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: "6px",
              borderBottom: "1px solid rgba(255,255,255,0.12)",
              paddingBottom: "4px",
            }}
          >
            {title}
          </div>
        )}
        <div style={{ fontSize: "11px", color: "#FFFFFF", lineHeight: 1.55, fontWeight: 500 }}>
          {content}
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#0F172A",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 11,
        color: "#FFFFFF",
      }}
    >
      {label && <p style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: 6 }}>{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: "#FFFFFF", margin: "2px 0" }}>
          <span style={{ color: entry.color || "#FFFFFF" }}>{entry.name}: </span>
          {entry.value}
        </p>
      ))}
    </div>
  );
}

function KpiCard({ kpi }) {
  const onTrack = kpi.status === "on_track";
  const color = onTrack ? "#34D399" : "#F05252";
  const badgeBg = onTrack ? "#34D39920" : "#F0525220";
  const displayValue = kpi.unit === "%" ? `${kpi.value}%` : String(kpi.value);

  const tip = KPI_TIPS[kpi.id];

  return (
    <TooltipUI title={kpi.label} content={tip}>
      <div className="bg-[var(--bg-card)] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all h-full">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] flex items-center gap-1">
          {kpi.label}
          <Info size={10} className="text-[var(--text-dim)] opacity-60" />
        </span>
        <span
          className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ color, background: badgeBg, border: `1px solid ${color}40` }}
        >
          {onTrack ? "On Track" : "Needs Action"}
        </span>
      </div>
      <div className="text-3xl font-black mb-3" style={{ color }}>{displayValue}</div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${Math.min(100, kpi.unit === "%" ? kpi.value : kpi.value)}%`,
            background: color,
          }}
        />
      </div>
      <p className="text-[10px] text-[var(--text-dim)]">{kpi.subtext1}</p>
      <p className="text-[10px] text-[var(--text-dim)] mt-0.5">{kpi.subtext2}</p>
      </div>
    </TooltipUI>
  );
}

function RoadmapCard({ rec, onNavigate }) {
  const cat = CATEGORY_META[rec.category] || CATEGORY_META.cross_cutting;
  const CatIcon = cat.icon;
  const pri = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.medium;
  const sectionLabel = cat.label;

  const cardTip = `${rec.finding} Recommended next step: ${rec.roadmap_action}`;

  return (
    <TooltipUI title={rec.title} content={cardTip}>
    <div className="bg-[var(--bg-card)] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: cat.color + "20", color: cat.color }}
          >
            <CatIcon size={16} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
              {sectionLabel}
            </span>
            <span
              className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ color: pri.color, background: pri.bg }}
            >
              {pri.label}
            </span>
            <span
              className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ color: cat.color, background: cat.color + "15" }}
            >
              {rec.tag}
            </span>
            <span className="text-[9px] text-[var(--text-dim)]">signal: {rec.signal_count}</span>
          </div>
        </div>
        {onNavigate && rec.link_section && (
          <button
            type="button"
            onClick={() => onNavigate(rec.link_section)}
            className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] hover:underline flex-shrink-0 flex items-center gap-1"
          >
            Open {sectionLabel.split(" ")[0]} <ArrowRight size={12} />
          </button>
        )}
      </div>

      <h3 className="text-lg font-bold text-[var(--text-main)] mb-4 leading-snug">{rec.title}</h3>

      <div className="space-y-3 text-[12px] leading-relaxed">
        <p>
          <strong className="text-[var(--text-main)]">Finding:</strong>{" "}
          <span className="text-[var(--text-dim)]">{rec.finding}</span>
        </p>
        <p>
          <strong className="text-[var(--text-main)]">Roadmap action:</strong>{" "}
          <span className="text-[var(--text-dim)]">{rec.roadmap_action}</span>
        </p>
      </div>

      {rec.checklist?.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {rec.checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-[12px] text-[var(--text-dim)]">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                <CheckCircle2 size={11} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
    </TooltipUI>
  );
}

export default function AdminEnhancementRoadmap({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/enhancement-roadmap");
      setData(res.data);
      toast.success("Enhancement roadmap refreshed");
    } catch {
      toast.error("Failed to load enhancement roadmap");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredRecs = useMemo(() => {
    if (!data?.recommendations) return [];
    if (activeTab === "all") return data.recommendations;
    return data.recommendations.filter((r) => r.category === activeTab);
  }, [data, activeTab]);

  const radarData = useMemo(() => {
    if (!data?.charts?.ragas_radar?.actual) return [];
    return data.charts.ragas_radar.actual.map((d) => ({
      metric: d.metric,
      actual: d.value,
      target: d.target,
    }));
  }, [data]);

  const cqsChartData = useMemo(() => {
    if (!data?.charts?.cqs_dimensions) return [];
    return data.charts.cqs_dimensions.map((d) => ({
      name: d.name,
      actual: d.actual,
      target: d.target,
      fill: DIM_COLORS[d.name] || "#F97316",
    }));
  }, [data]);

  const priorityMix = data?.charts?.priority_mix?.filter((d) => d.value > 0) || [];

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
        <p>Unable to load enhancement roadmap.</p>
        <button type="button" onClick={fetchData} className="mt-4 text-[var(--accent)] text-sm font-bold hover:underline">
          Retry
        </button>
      </div>
    );
  }

  const tabCounts = data.tab_counts || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-disp font-bold text-xl flex items-center gap-2">
            <Map size={22} className="text-[var(--accent)]" />
            Enhancement Roadmap
          </h2>
          <p className="text-[var(--text-dim)] text-sm mt-1 max-w-2xl">
            Live KPI health, quality radar, and prioritized action backlog synthesized from RAGAS,
            patient feedback, alerts, escalations, and conversation quality scores.
          </p>
          <p className="text-[10px] font-mono text-[var(--text-dim)] mt-2">
            Last refreshed: {parseUtcDate(data.refreshed_at)?.toLocaleString() ?? "—"} · {data.period_days}-day window · {data.backlog_total} actionable items
          </p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 text-[11px] font-bold border border-white/10 px-4 py-2 rounded-full hover:bg-white/5 transition-all text-[var(--text-dim)] hover:text-[var(--text-main)]"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TooltipUI title="RAGAS Quality Radar" content={CHART_TIPS.ragas_radar}>
          <div className="bg-[var(--bg-card)] border border-white/5 rounded-2xl p-5 h-full">
            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5">
              RAGAS Quality Radar <Info size={12} className="text-[var(--text-dim)] opacity-60" />
            </h3>
            <p className="text-[10px] text-[var(--text-dim)] mb-4">Hover any point for actual vs target values</p>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--text-dim)", fontSize: 10 }} />
                <Radar name="Actual" dataKey="actual" stroke="#34D399" fill="#34D399" fillOpacity={0.35} />
                <Radar name="Target" dataKey="target" stroke="#F97316" fill="#F97316" fillOpacity={0.1} strokeDasharray="4 4" />
                <Tooltip content={<ChartTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </TooltipUI>

        <TooltipUI title="CQS Dimension Scores" content={CHART_TIPS.cqs_dimensions}>
          <div className="bg-[var(--bg-card)] border border-white/5 rounded-2xl p-5 h-full">
            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5">
              CQS Dimension Scores <Info size={12} className="text-[var(--text-dim)] opacity-60" />
            </h3>
            <p className="text-[10px] text-[var(--text-dim)] mb-4">Hover bars for score and target values</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={cqsChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "var(--text-dim)", fontSize: 9 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "var(--text-dim)", fontSize: 9 }} ticks={[0, 25, 50, 75, 100]} />
                <Tooltip content={<ChartTooltip />} formatter={(v, name) => [v, name === "actual" ? "Score" : "Target"]} />
                <Bar dataKey="target" fill="rgba(255,255,255,0.08)" radius={[4, 4, 0, 0]} barSize={28} />
                <Bar dataKey="actual" radius={[4, 4, 0, 0]} barSize={14}>
                  {cqsChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TooltipUI>

        <TooltipUI title="Recommendation Priority Mix" content={CHART_TIPS.priority_mix}>
          <div className="bg-[var(--bg-card)] border border-white/5 rounded-2xl p-5 h-full">
            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5">
              Recommendation Priority Mix <Info size={12} className="text-[var(--text-dim)] opacity-60" />
            </h3>
            <p className="text-[10px] text-[var(--text-dim)] mb-2">
              {data.backlog_total} actionable items in backlog
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={priorityMix.length ? priorityMix : [{ name: "None", value: 1, color: "#334155" }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {(priorityMix.length ? priorityMix : [{ color: "#334155" }]).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {priorityMix.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-[10px] text-[var(--text-dim)]">
                  <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  {item.name} ({item.value})
                </div>
              ))}
            </div>
          </div>
        </TooltipUI>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {data.summary_cards.map((card) => {
          const Icon = SUMMARY_ICONS[card.id] || Target;
          return (
            <TooltipUI key={card.id} title={card.label} content={SUMMARY_TIPS[card.id]}>
              <div className="bg-[var(--bg-card)] border border-white/5 rounded-2xl p-4 relative overflow-visible h-full">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-dim)] flex items-center gap-1">
                    {card.label}
                    <Info size={10} className="opacity-60" />
                  </span>
                  <Icon size={16} style={{ color: card.color }} />
                </div>
                <div className="text-2xl font-black" style={{ color: card.color }}>{card.value}</div>
                <p className="text-[10px] text-[var(--text-dim)] mt-1">{card.sub}</p>
              </div>
            </TooltipUI>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const count = tab.id === "all" ? tabCounts.all : tabCounts[tab.id] || 0;
          const isActive = activeTab === tab.id;
          return (
            <TooltipUI key={tab.id} title={tab.label} content={TAB_TIPS[tab.id]} inline>
              <button
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all ${
                  isActive
                    ? "bg-[var(--accent)] text-white"
                    : "bg-white/5 text-[var(--text-dim)] hover:bg-white/10 hover:text-[var(--text-main)]"
                }`}
              >
                {tab.label}{count > 0 && tab.id !== "all" ? ` (${count})` : ""}
              </button>
            </TooltipUI>
          );
        })}
      </div>

      {/* Roadmap cards */}
      <div className="space-y-4">
        {filteredRecs.length === 0 ? (
          <div className="text-center py-12 bg-[var(--bg-card)] border border-white/5 rounded-2xl">
            <CheckCircle2 size={32} className="mx-auto mb-3 text-[#34D399]" />
            <p className="text-[var(--text-dim)] text-sm">No roadmap items match the current filter.</p>
          </div>
        ) : (
          filteredRecs.map((rec) => (
            <RoadmapCard key={rec.id} rec={rec} onNavigate={onNavigate} />
          ))
        )}
      </div>
    </div>
  );
}
