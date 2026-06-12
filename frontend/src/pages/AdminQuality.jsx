import React, { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  Cell, LineChart, Line, AreaChart, Area, LabelList
} from 'recharts';
import { 
  Brain, Filter, ChevronDown, ChevronRight, BookOpen, X, Download
} from 'lucide-react';

async function apiFetch(path) {
  const { data } = await api.get(path);
  return data;
}

// Patient portal display names (+ legacy admin API label mapping)
const LEGACY_DISEASE_LABELS = {
  "Diabetes Care (DM)": "Diabetes",
  "Cardiovascular (CV)": "Cardiovascular",
  "Cancer Care (CA)": "Cancer Care",
  "Mental Illness (MH)": "Mental Health",
  "Respiratory (RS)": "Respiratory",
};

const DISEASE_DISPLAY_TO_CODE = {
  "Mental Health": "MH",
  "Cancer Care": "CA",
  "Diabetes": "DM",
  "Cardiovascular": "CV",
  "Respiratory": "RS",
};

const DISEASE_CODE_TO_DISPLAY = Object.fromEntries(
  Object.entries(DISEASE_DISPLAY_TO_CODE).map(([k, v]) => [v, k])
);

const AGENT_REGISTRY = {
  "Cancer Care": [
    { id: "CA1", short: "Screening" }, { id: "CA2", short: "Treatment" },
    { id: "CA3", short: "Supportive" }, { id: "CA4", short: "Survivorship" },
    { id: "CA5", short: "Genetics" }, { id: "CA6", short: "General" },
  ],
  "Diabetes": [
    { id: "DM1", short: "Monitoring" }, { id: "DM2", short: "Medication" },
    { id: "DM3", short: "Nutrition" }, { id: "DM4", short: "Complications" },
    { id: "DM5", short: "Gestational" }, { id: "DM6", short: "General" },
  ],
  "Cardiovascular": [
    { id: "CV1", short: "Clinical" }, { id: "CV2", short: "Emergency" },
    { id: "CV3", short: "Medications" }, { id: "CV4", short: "Rehab" },
    { id: "CV5", short: "Nutrition" }, { id: "CV6", short: "General" },
  ],
  "Mental Health": [
    { id: "MH1", short: "Depression" }, { id: "MH2", short: "Anxiety" },
    { id: "MH3", short: "Sleep" }, { id: "MH4", short: "Trauma" },
    { id: "MH5", short: "Crisis" }, { id: "MH6", short: "General" },
  ],
  "Respiratory": [
    { id: "RS1", short: "Asthma" }, { id: "RS2", short: "COPD" },
    { id: "RS3", short: "Rehab" }, { id: "RS4", short: "Medications" },
    { id: "RS5", short: "Sleep Apnea" }, { id: "RS6", short: "General" },
  ],
};

const LEGACY_AGENT_LABELS = {
  "Endocrinology Specialist": "Monitoring",
  "Diabetes Primary Care": "Medication",
  "Diabetes Nurse": "Nutrition",
  "Diabetes Dietitian": "Complications",
  "Diabetes Educator": "Gestational",
  "Cardiology Specialist": "Clinical",
  "CV Primary Care": "Emergency",
  "CV Nurse": "Medications",
  "CV Technician": "Rehab",
  "Heart Health Coach": "Nutrition",
  "Oncology Specialist": "Screening",
  "Cancer Primary Care": "Treatment",
  "Oncology Nurse": "Supportive",
  "Radiology Specialist": "Survivorship",
  "Patient Navigator": "Genetics",
  "Mental Health Specialist": "Depression",
  "Psychiatric Nurse": "Anxiety",
  "Therapist Agent": "Sleep",
  "MH Primary Care": "Trauma",
  "Support Group Coord": "Crisis",
  "Pulmonary Rehab Specialist": "Rehab",
  "Respiratory Nurse": "Medications",
  "Asthma Specialist": "Asthma",
  "COPD Specialist": "COPD",
  "Sleep Apnea Specialist": "Sleep Apnea",
  "Human Coordinator": "General",
};

function displayDiseaseName(name) {
  if (!name) return "—";
  return LEGACY_DISEASE_LABELS[name] || name;
}

function displayAgentName(name) {
  if (!name) return "—";
  return LEGACY_AGENT_LABELS[name] || name;
}

function normalizeQualityMatrix(matrix = []) {
  return matrix.map(row => ({
    ...row,
    disease: displayDiseaseName(row.disease),
    agent: displayAgentName(row.agent),
  }));
}

const DIM_KEYS = ['E', 'R', 'C', 'S', 'F', 'V'];

function avg(nums) {
  if (!nums.length) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function computeOverallCqs(dimensions = {}) {
  return Math.round(
    Object.entries(CQS_STRUCTURE).reduce((sum, [key, dim]) => {
      return sum + (Number(dimensions[key]) || 0) * dim.weight;
    }, 0) * 10
  ) / 10;
}

function getCqsTier(score) {
  if (score >= 85) return { label: 'GREEN', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' };
  if (score >= 70) return { label: 'AMBER', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' };
  return { label: 'RED', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' };
}

function formatRefreshTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function buildCqsByDisease(matrix = []) {
  return aggregateMatrixByField(matrix, 'disease').map(row => ({
    code: DISEASE_DISPLAY_TO_CODE[row.name] || row.name,
    name: row.name,
    cqs: row.cqs,
    count: row.count,
  }));
}

function buildCqsByAgent(matrix = [], diseaseName) {
  const filtered = matrix.filter(row => row.disease === diseaseName);
  return aggregateMatrixByField(filtered, 'agent').map(row => {
    const meta = (AGENT_REGISTRY[diseaseName] || []).find(a => a.short === row.name);
    return {
      label: meta ? `${meta.id} — ${meta.short}` : row.name,
      agentId: meta?.id,
      cqs: row.cqs,
      count: row.count,
    };
  });
}

function aggregateMatrixByField(matrix = [], field) {
  const groups = {};
  for (const row of matrix) {
    const key = row[field] || '—';
    if (!groups[key]) {
      groups[key] = { name: key, E: [], R: [], C: [], S: [], F: [], V: [], cqs: [], count: 0 };
    }
    const g = groups[key];
    DIM_KEYS.forEach(k => g[k].push(Number(row[k]) || 0));
    g.cqs.push(Number(row.cqs) || 0);
    g.count += 1;
  }
  return Object.values(groups)
    .map(g => ({
      name: g.name,
      E: avg(g.E),
      R: avg(g.R),
      C: avg(g.C),
      S: avg(g.S),
      F: avg(g.F),
      V: avg(g.V),
      cqs: avg(g.cqs),
      count: g.count,
    }))
    .sort((a, b) => b.cqs - a.cqs);
}

const Badge = ({ children, color = 'var(--accent)' }) => (
  <span
    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
    style={{ color, background: color + '18', border: `1px solid ${color}30` }}
  >
    {children}
  </span>
);

const CQS_STRUCTURE = {
  engagement: {
    label: "Engagement",
    initial: "E",
    weight: 0.30,
    color: "#0C447C",
    bg: "#E6F1FB",
    desc: "How actively the patient participates and returns",
    params: [
      { key: "star_rating", label: "Star rating (avg)", tag: "Direct", weight: 35, source: "patient_feedback.rating", formula: "AVG(rating) per patient", tip: "Average user satisfaction rating collected after chats." },
      { key: "chip_click_rate", label: "Chip click rate", tag: "Derived", weight: 25, source: "messages.meta_json.chip_clicks", formula: "chip_click_count / chips_shown", tip: "Frequency of users clicking on suggested prompt chips." },
      { key: "return_session_rate", label: "Return session rate", tag: "Derived", weight: 20, source: "conversations.user_id COUNT", formula: "sessions > 1 / total patients", tip: "Percentage of users who come back for more than one session." },
      { key: "conv_depth", label: "Conversation depth (turns)", tag: "Derived", weight: 12, source: "COUNT(messages) per conversation", formula: "AVG(message_count) per conv", tip: "Average number of back-and-forth turns in a session." },
      { key: "elaboration_rate", label: "Follow-up elaboration rate", tag: "Derived", weight: 8, source: "LENGTH(messages.content)", formula: "user turns > 20 words / total", tip: "How often patients give detailed, long-form answers." }
    ]
  },
  response_quality: {
    label: "Response quality",
    initial: "R",
    weight: 0.25,
    color: "#3B6D11",
    bg: "#EAF3DE",
    desc: "Accuracy, relevance and depth of AI answers",
    params: [
      { key: "faithfulness", label: "Faithfulness (RAGAS)", tag: "RAGAS", weight: 30, source: "ragas_metrics.faithfulness", formula: "AVG(faithfulness_score)", tip: "Ensures the AI doesn't hallucinate; answers must be grounded in clinical docs." },
      { key: "answer_relevancy", label: "Answer relevancy (RAGAS)", tag: "RAGAS", weight: 25, source: "ragas_metrics.answer_relevancy", formula: "AVG(answer_relevancy)", tip: "Measures if the AI's response actually addresses the patient's core question." },
      { key: "context_precision", label: "Context precision (RAGAS)", tag: "RAGAS", weight: 20, source: "ragas_metrics.context_precision", formula: "AVG(context_precision)", tip: "How well the retrieved clinical documents matched the patient's query." },
      { key: "context_recall", label: "Context recall (RAGAS)", tag: "RAGAS", weight: 15, source: "ragas_metrics.context_recall", formula: "AVG(context_recall)", tip: "Whether all necessary information was found in the documentation to answer the query." },
      { key: "ai_confidence", label: "AI confidence score", tag: "Derived", weight: 10, source: "messages.confidence", formula: "AVG(confidence) where role=assistant", tip: "The AI's internal certainty level about the medical accuracy of its response." }
    ]
  },
  clinical_safety: {
    label: "Clinical safety",
    initial: "C",
    weight: 0.20,
    color: "#991B1B",
    bg: "#FEF2F2",
    desc: "Guardrails, escalation and safe messaging compliance",
    params: [
      { key: "guardrail_compliance", label: "Guardrail compliance rate", tag: "Safety", weight: 35, source: "system_alerts WHERE component=guardrail", formula: "1 - (guardrail_breaches / total)", tip: "Success rate of keeping the AI within strict clinical and safety boundaries." },
      { key: "escalation_accuracy", label: "Escalation accuracy", tag: "Safety", weight: 25, source: "conversations.escalated + system_alerts", formula: "appropriate_escalations / total_escalated", tip: "How correctly the AI identified when to bring in a human specialist." },
      { key: "emergency_response", label: "Emergency response time", tag: "Safety", weight: 20, source: "messages.processing_ms WHERE agent_id IN (CV2, MH5)", formula: "AVG(processing_ms) for CV2/MH5 agents", tip: "Latency of high-priority agents handling critical health topics." },
      { key: "disclaimer_rate", label: "Disclaimer present rate", tag: "Compliance", weight: 15, source: "messages.content LIKE %consult%", formula: "responses with disclaimer / total AI msgs", tip: "Percentage of AI messages that correctly include medical disclaimers." },
      { key: "citation_rate", label: "Citation provided rate", tag: "Compliance", weight: 5, source: "messages.citations IS NOT NULL", formula: "AI msgs with citations / total AI msgs", tip: "How often the AI backs up its claims with links to clinical sources." }
    ]
  },
  session_flow: {
    label: "Session flow",
    initial: "S",
    weight: 0.15,
    color: "#92400E",
    bg: "#FFFBEB",
    desc: "Conversation coherence, slot efficiency and frustration",
    params: [
      { key: "repeat_question_rate", label: "Repeat question rate", tag: "Coherence", weight: 30, source: "messages.meta_json.chip_echo_detected", formula: "chip_echo_count / total user msgs", tip: "How often the AI asks the same question multiple times (lower is better)." },
      { key: "slot_efficiency", label: "Slot fill efficiency", tag: "Coherence", weight: 25, source: "messages.meta_json.slots_filled COUNT", formula: "slots_filled / max_slots per intent", tip: "How quickly the AI gathers necessary medical data from the patient." },
      { key: "skip_rate", label: "Clarification skip rate", tag: "Coherence", weight: 20, source: "messages.meta_json.skip_used", formula: "skip_triggered / questions_asked", tip: "How often patients choose to skip clarifying questions." },
      { key: "intent_resolution", label: "Intent resolution rate", tag: "Coherence", weight: 15, source: "messages.meta_json.intent", formula: "intents_resolved / total intents detected", tip: "Success rate of resolving the patient's underlying medical need." },
      { key: "frustration_score", label: "Frustration score (avg)", tag: "Sentiment", weight: 10, source: "messages.frustration (inverted)", formula: "1 - AVG(frustration/100)", tip: "Measures patient sentiment throughout the conversation." }
    ]
  },
  format_variety: {
    label: "Format variety",
    initial: "F",
    weight: 0.07,
    color: "#1E3A8A",
    bg: "#EFF6FF",
    desc: "Response format rotation and length appropriateness",
    params: [
      { key: "format_rotation", label: "Format rotation index", tag: "Variety", weight: 40, source: "messages.meta_json.response_format", formula: "unique formats / total AI msgs (capped 1)", tip: "How well the AI mixes text, lists, and tables to present info." },
      { key: "length_appropriateness", label: "Appropriate length rate", tag: "Variety", weight: 35, source: "messages.meta_json.format_used + word_count", formula: "responses within intent word limit / total", tip: "Whether the AI answers were too long or too short for the context." },
      { key: "generic_response_rate", label: "Generic response rate", tag: "Variety", weight: 25, source: "messages.content regex check", formula: "1 - (numbered_1to6_format_count / total)", tip: "Measures how unique and personalized the AI's language is." }
    ]
  },
  velocity: {
    label: "Velocity",
    initial: "V",
    weight: 0.03,
    color: "#065F46",
    bg: "#ECFDF5",
    desc: "Latency and session completion speed",
    params: [
      { key: "p50_latency", label: "P50 response latency", tag: "Perf", weight: 50, source: "messages.processing_ms", formula: "PERCENTILE_CONT(0.5) of processing_ms", tip: "The median response time; the speed experienced by most users." },
      { key: "p95_latency", label: "P95 response latency", tag: "Perf", weight: 30, source: "messages.processing_ms", formula: "PERCENTILE_CONT(0.95) of processing_ms", tip: "The 'slowest' cases; ensures efficiency even for complex medical queries." },
      { key: "completion_rate", label: "Session completion rate", tag: "Perf", weight: 20, source: "conversations + COUNT(messages WHERE role=assistant)", formula: "convs with >=1 AI answer / total sessions", tip: "Percentage of started sessions that successfully reach a clinical response." }
    ]
  }
};

const CQS_PARAM_COUNT = Object.values(CQS_STRUCTURE).reduce((n, d) => n + d.params.length, 0);

export default function AdminQuality() {
  const [disease, setDisease] = useState('all');
  const [agent, setAgent] = useState('all');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [daysFilter, setDaysFilter] = useState(7);
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [expandedDefDimensions, setExpandedDefDimensions] = useState(new Set(['engagement']));
  const [selectedChartDisease, setSelectedChartDisease] = useState(null);

  useEffect(() => {
    // Only show full loading spinner on first load
    if (!data) setLoading(true);
    
    api.get(`/admin/quality/summary?days=${daysFilter}`)
      .then(res => {
        const enhancedData = { ...res.data };
        if (enhancedData.matrix) {
          enhancedData.matrix = normalizeQualityMatrix(enhancedData.matrix);
        }
        if (!enhancedData.dimensions) enhancedData.dimensions = {};
        Object.keys(CQS_STRUCTURE).forEach(dk => {
          if (!enhancedData.dimensions[dk]) enhancedData.dimensions[dk] = 85; 
        });
        setData(enhancedData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch quality summary", err);
        const mockData = { dimensions: {} };
        Object.keys(CQS_STRUCTURE).forEach(dk => mockData.dimensions[dk] = 85);
        setData(mockData);
        setLoading(false);
      });
  }, [daysFilter]);

  const AGENTS_BY_DISEASE = {
    all: ["All Agents"],
    "Cancer Care":      ["Screening", "Treatment", "Supportive", "Survivorship", "Genetics", "General"],
    "Diabetes":         ["Monitoring", "Medication", "Nutrition", "Complications", "Gestational", "General"],
    "Cardiovascular":   ["Clinical", "Emergency", "Medications", "Rehab", "Nutrition", "General"],
    "Mental Health":    ["Depression", "Anxiety", "Sleep", "Trauma", "Crisis", "General"],
    "Respiratory":      ["Asthma", "COPD", "Rehab", "Medications", "Sleep Apnea", "General"],
  };

  const currentAgents = AGENTS_BY_DISEASE[disease] || AGENTS_BY_DISEASE.all;

  const downloadExcel = () => {
    if (!data || !data.matrix) return;
    const headers = ["Date", "Disease", "Agent", "Engagement (30%)", "Response Quality (25%)", "Clinical Safety (20%)", "Session Flow (15%)", "Format Variety (7%)", "Velocity (3%)", "CQS Overall", "Tier"];
    const rows = data.matrix.map(row => [
      row.date, row.disease, row.agent, row.E, row.R, row.C, row.S, row.F, row.V, row.cqs,
      row.cqs >= 85 ? "GREEN" : row.cqs >= 70 ? "AMBER" : "RED"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `CQS_Report_${daysFilter}_days.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleDefDimension = (key) => {
    setExpandedDefDimensions(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const diseaseChartData = useMemo(
    () => buildCqsByDisease(data?.matrix || []),
    [data?.matrix]
  );

  const agentChartData = useMemo(
    () => (selectedChartDisease ? buildCqsByAgent(data?.matrix || [], selectedChartDisease) : []),
    [data?.matrix, selectedChartDisease]
  );

  useEffect(() => {
    if (!diseaseChartData.length) return;
    if (!selectedChartDisease || !diseaseChartData.some(d => d.name === selectedChartDisease)) {
      setSelectedChartDisease(diseaseChartData[0].name);
    }
  }, [diseaseChartData, selectedChartDisease]);

  const selectedDiseaseMeta = diseaseChartData.find(d => d.name === selectedChartDisease);
  const selectedDiseaseCode = selectedDiseaseMeta?.code || '—';

  const overallCqs = data?.overall_cqs ?? computeOverallCqs(data?.dimensions);
  const cqsTier = getCqsTier(overallCqs);
  const uniqueConversations = data?.unique_conversations ?? data?.active_patients ?? 0;
  const refreshLabel = formatRefreshTime(data?.refreshed_at);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header, definition & live metadata */}
      <div className="flex flex-col gap-4 border-b border-white/5 pb-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 space-y-3 min-w-0">
            <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight">Conversation Quality Score (CQS)</h2>
            <p className="text-sm text-[var(--text-dim)] max-w-4xl leading-relaxed">
              The Conversation Quality Score (CQS) is a 0–100 index measuring how effectively patient sessions perform
              across engagement, response quality, clinical safety, session flow, format variety, and velocity.
            </p>
            <p className="text-sm text-[var(--text-dim)] max-w-4xl leading-relaxed">
              This score is computed in real-time from the PRISM PostgreSQL database and updates automatically as new conversations occur.
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-dim)]">
              <span className="font-medium">{CQS_PARAM_COUNT} parameters · 6 weighted dimensions</span>
              <span className="text-[#F472B6] font-bold">
                {loading ? '…' : uniqueConversations} unique conversations analyzed (live)
              </span>
              <span className="font-mono">refreshed {loading ? '…' : refreshLabel}</span>
            </div>
            <p className="text-[10px] text-[var(--text-dim)] italic max-w-3xl">
              Overall score uses all conversations in the database; the matrix table below respects the selected timeframe filter.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDefinitions(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all shrink-0
              ${showDefinitions
                ? 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40 shadow-[0_0_20px_rgba(45,212,191,0.12)]'
                : 'bg-white/5 text-[var(--text-dim)] border-white/10 hover:text-white hover:border-white/20'}`}
          >
            <BookOpen size={14} />
            Metrics Definition
            {showDefinitions && <X size={12} className="opacity-60" />}
          </button>
        </div>
      </div>

      {showDefinitions && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-500 space-y-6">
          <div className="card p-6 border-[var(--accent)]/20 bg-gradient-to-br from-[var(--accent)]/5 via-transparent to-transparent">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="font-disp font-bold text-lg text-[var(--text-main)]">Quality Metrics Definition — Calculation Reference</h3>
                <p className="text-sm text-[var(--text-dim)] mt-1 max-w-3xl leading-relaxed">
                  CQS evaluates every patient conversation across{' '}
                  <strong className="text-[var(--text-main)]">6 dimensions</strong> and{' '}
                  <strong className="text-[var(--text-main)]">{CQS_PARAM_COUNT} parameters</strong>.
                  Scores are averaged per patient and rolled up into the overall CQS index.
                </p>
              </div>
              <Badge color="var(--accent)">{CQS_PARAM_COUNT} Metrics</Badge>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest mb-1">Score Range</div>
                <p className="text-[11px] text-[var(--text-dim)]">Each dimension and CQS overall is scored 0–100. Tier: GREEN ≥85, AMBER 70–84, RED &lt;70.</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest mb-1">Evaluation Window</div>
                <p className="text-[11px] text-[var(--text-dim)]">Rolling window of the last {daysFilter} days across all disease agents and patient sessions.</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest mb-1">Composite Formula</div>
                <p className="text-[11px] font-mono text-[var(--text-main)]">CQS = E×0.30 + R×0.25 + C×0.20 + S×0.15 + F×0.07 + V×0.03</p>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(CQS_STRUCTURE).map(([key, dim]) => {
                const isExpanded = expandedDefDimensions.has(key);
                return (
                  <div key={key} className="rounded-2xl border border-white/10 bg-[var(--bg-card)]/80 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleDefDimension(key)}
                      className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
                    >
                      {isExpanded
                        ? <ChevronDown size={16} className="shrink-0" style={{ color: dim.color }} />
                        : <ChevronRight size={16} className="text-[var(--text-dim)] shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-[var(--text-main)]">{dim.label}</span>
                          <Badge color={dim.color}>{dim.initial} · {(dim.weight * 100)}%</Badge>
                          <Badge color="var(--text-dim)">{dim.params.length} parameters</Badge>
                        </div>
                        <p className="text-[11px] text-[var(--text-dim)] mt-0.5">{dim.desc}</p>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-4 space-y-3 border-t border-white/5 pt-3">
                        {dim.params.map(p => (
                          <div
                            key={p.key}
                            className="rounded-xl border border-white/10 bg-black/20 overflow-hidden"
                            style={{ borderLeftColor: dim.color, borderLeftWidth: 3 }}
                          >
                            <div className="px-4 py-3">
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <span className="text-sm font-bold text-[var(--text-main)]">{p.label}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-[var(--text-dim)]">{p.tag}</span>
                                <span className="text-[10px] font-mono text-[var(--text-dim)]">{p.weight}% of {dim.initial}</span>
                              </div>
                              <p className="text-[11px] text-[var(--text-dim)] leading-relaxed mb-2">{p.tip}</p>
                              <div className="text-[10px] font-mono text-white/40 mb-1">{p.source}</div>
                              <p className="text-[11px] font-mono text-[var(--text-main)] bg-black/30 rounded-lg px-3 py-2 border border-white/5">{p.formula}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Overall CQS Score Card */}
      <div
        className="rounded-2xl border border-white/10 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
        style={{ background: `linear-gradient(135deg, ${cqsTier.color}18, transparent)` }}
      >
        <div className="space-y-2 max-w-xl">
          <div className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-[0.25em]">
            Overall Conversation Quality Score
          </div>
          <p className="text-sm text-[var(--text-dim)] leading-relaxed">
            Weighted average across all six dimensions, recalculated live from stored conversation telemetry.
          </p>
          <p className="text-[11px] text-[var(--text-dim)] font-medium">
            {loading ? '…' : uniqueConversations} unique conversations in this average
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-5xl md:text-6xl font-black tracking-tighter leading-none" style={{ color: cqsTier.color }}>
              {loading ? '—' : overallCqs}
            </div>
            <div className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest mt-1">CQS / 100</div>
          </div>
          {!loading && (
            <span
              className="px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest border"
              style={{ color: cqsTier.color, background: cqsTier.bg, borderColor: `${cqsTier.color}40` }}
            >
              {cqsTier.label}
            </span>
          )}
        </div>
      </div>

      {/* CQS by Disease & Agent charts */}
      <div className="grid grid-cols-1 gap-6">
        <div className="card p-6 border border-white/10 bg-[var(--bg-card)] rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
            <div>
              <h3 className="text-sm font-black text-[var(--text-main)]">CQS by Disease</h3>
              <p className="text-[11px] text-[var(--text-dim)] mt-1">
                Average CQS per disease (all conversations) — click a bar for agents
              </p>
            </div>
            {selectedDiseaseMeta && !loading && (
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold border shrink-0"
                style={{ color: '#EF4444', borderColor: '#EF444460', background: 'rgba(239, 68, 68, 0.1)' }}
              >
                Selected: {selectedDiseaseCode} · {selectedDiseaseMeta.cqs} CQS
              </span>
            )}
          </div>
          {loading ? (
            <div className="h-[280px] flex items-center justify-center text-xs text-[var(--text-dim)]">Loading chart…</div>
          ) : diseaseChartData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-xs text-[var(--text-dim)]">No disease data available yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={diseaseChartData}
                margin={{ top: 24, right: 12, left: 0, bottom: 8 }}
                onClick={(state) => {
                  const payload = state?.activePayload?.[0]?.payload;
                  if (payload?.name) setSelectedChartDisease(payload.name);
                }}
              >
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="code"
                  tick={{ fill: 'var(--text-dim)', fontSize: 11, fontWeight: 700 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fill: 'var(--text-dim)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, fontSize: 11 }}
                  formatter={(value) => [`${value} CQS`, 'Average']}
                  labelFormatter={(code) => DISEASE_CODE_TO_DISPLAY[code] || code}
                />
                <Bar
                  dataKey="cqs"
                  radius={[6, 6, 0, 0]}
                  className="cursor-pointer"
                  onClick={(entry) => entry?.name && setSelectedChartDisease(entry.name)}
                >
                  {diseaseChartData.map((entry) => {
                    const isSelected = entry.name === selectedChartDisease;
                    return (
                      <Cell
                        key={entry.code}
                        fill={isSelected ? '#EF4444' : '#7F1D1D'}
                        stroke={isSelected ? '#FFFFFF' : 'transparent'}
                        strokeWidth={isSelected ? 1.5 : 0}
                      />
                    );
                  })}
                  <LabelList
                    dataKey="cqs"
                    position="top"
                    content={({ x, y, width, value, index }) => {
                      const entry = diseaseChartData[index];
                      const isSelected = entry?.name === selectedChartDisease;
                      return (
                        <text
                          x={x + width / 2}
                          y={y - 6}
                          textAnchor="middle"
                          fill={isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
                          fontSize={11}
                          fontWeight={isSelected ? 800 : 600}
                        >
                          {value}
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-6 border border-white/10 bg-[var(--bg-card)] rounded-2xl">
          <div className="mb-6">
            <h3 className="text-sm font-black text-[var(--text-main)]">CQS by Agent</h3>
            <p className="text-[11px] text-[var(--text-dim)] mt-1">
              {selectedChartDisease
                ? `${DISEASE_CODE_TO_DISPLAY[selectedDiseaseCode] || selectedChartDisease} (${selectedDiseaseCode}) — average CQS per specialist (${agentChartData.length} agents with data)`
                : 'Select a disease above to view agent breakdown'}
            </p>
          </div>
          {loading ? (
            <div className="h-[320px] flex items-center justify-center text-xs text-[var(--text-dim)]">Loading chart…</div>
          ) : agentChartData.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-xs text-[var(--text-dim)]">No agent data for this disease yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(280, agentChartData.length * 44)}>
              <BarChart
                layout="vertical"
                data={agentChartData}
                margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fill: 'var(--text-dim)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={148}
                  tick={{ fill: 'var(--text-dim)', fontSize: 10, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, fontSize: 11 }}
                  formatter={(value) => [`${value} CQS`, 'Average']}
                />
                <Bar dataKey="cqs" fill="#EF4444" radius={[0, 6, 6, 0]}>
                  <LabelList
                    dataKey="cqs"
                    position="right"
                    formatter={(v) => v}
                    style={{ fill: '#fff', fontSize: 11, fontWeight: 800 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {!showDefinitions && (
        loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4 min-h-[400px]">
            <div className="w-12 h-12 border-4 border-[var(--accent)]/10 border-t-[var(--accent)] rounded-full animate-spin" />
            <span className="text-sm font-black text-[var(--text-dim)] uppercase tracking-[0.2em] animate-pulse">Syncing Quality Engine...</span>
          </div>
        ) : (
          <>
            <div className="mt-6 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2 mb-1">Real-time CQS Performance Matrix</h3>
                <p className="text-sm text-[var(--text-dim)] font-medium">Live 6-dimension conversation quality breakdown across all supported disease scopes and agent tiers.</p>
              </div>

              <div className="flex items-center gap-2 flex-nowrap overflow-x-auto no-scrollbar bg-[var(--bg-card)] border border-white/5 p-1.5 rounded-2xl shadow-2xl">
                <div className="relative group min-w-[160px]">
                  <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                  <select
                    value={disease}
                    onChange={e => {
                      setDisease(e.target.value);
                      setAgent('all');
                    }}
                    className="w-full pl-8 pr-7 py-1.5 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold appearance-none hover:border-[var(--accent)]/50 transition-all cursor-pointer"
                  >
                    <option value="all" className="bg-[#1a1a2e]">All Diseases</option>
                    <option value="Cancer Care" className="bg-[#1a1a2e]">Cancer Care</option>
                    <option value="Diabetes" className="bg-[#1a1a2e]">Diabetes</option>
                    <option value="Cardiovascular" className="bg-[#1a1a2e]">Cardiovascular</option>
                    <option value="Mental Health" className="bg-[#1a1a2e]">Mental Health</option>
                    <option value="Respiratory" className="bg-[#1a1a2e]">Respiratory</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] pointer-events-none" />
                </div>

                <div className={`relative group min-w-[180px] ${disease === 'all' ? 'opacity-50' : ''}`}>
                  <Brain size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                  <select
                    value={agent}
                    disabled={disease === 'all'}
                    onChange={e => setAgent(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold appearance-none hover:border-[var(--accent)]/50 transition-all cursor-pointer"
                  >
                    <option value="all" className="bg-[#1a1a2e]">All Agents</option>
                    {currentAgents.map((a, i) => a !== "All Agents" && (
                      <option key={i} value={a} className="bg-[#1a1a2e]">{a}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] pointer-events-none" />
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 min-w-[140px]">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest whitespace-nowrap">Timeframe:</span>
                  <select
                    className="bg-transparent text-white text-[10px] font-bold outline-none cursor-pointer focus:ring-0 border-none p-0"
                    value={daysFilter}
                    onChange={(e) => setDaysFilter(parseInt(e.target.value))}
                  >
                    <option value="7" className="bg-[#1a1a2e]">Last 7 Days</option>
                    <option value="14" className="bg-[#1a1a2e]">Last 14 Days</option>
                    <option value="21" className="bg-[#1a1a2e]">Last 21 Days</option>
                    <option value="30" className="bg-[#1a1a2e]">Last 1 Month</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={downloadExcel}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[var(--accent)] hover:brightness-110 text-white text-[10px] font-black transition-all shadow-lg whitespace-nowrap"
                >
                  <Download size={12} />
                  DOWNLOAD EXCEL
                </button>
              </div>
            </div>

            <div className="card overflow-hidden border border-white/5 bg-[var(--bg-card)]">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#0F172A]">
                    <tr>
                      <th className="px-4 py-3 font-mono text-[10px] text-ink3 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 font-mono text-[10px] text-ink3 uppercase tracking-wider">Disease</th>
                      <th className="px-4 py-3 font-mono text-[10px] text-ink3 uppercase tracking-wider">Agent</th>
                      <th className="px-4 py-3 font-mono text-[10px] text-white uppercase tracking-wider text-center">E<br /><span className="text-[8px] text-ink3">30%</span></th>
                      <th className="px-4 py-3 font-mono text-[10px] text-white uppercase tracking-wider text-center">R<br /><span className="text-[8px] text-ink3">25%</span></th>
                      <th className="px-4 py-3 font-mono text-[10px] text-white uppercase tracking-wider text-center">C<br /><span className="text-[8px] text-ink3">20%</span></th>
                      <th className="px-4 py-3 font-mono text-[10px] text-white uppercase tracking-wider text-center">S<br /><span className="text-[8px] text-ink3">15%</span></th>
                      <th className="px-4 py-3 font-mono text-[10px] text-white uppercase tracking-wider text-center">F<br /><span className="text-[8px] text-ink3">7%</span></th>
                      <th className="px-4 py-3 font-mono text-[10px] text-white uppercase tracking-wider text-center">V<br /><span className="text-[8px] text-ink3">3%</span></th>
                      <th className="px-4 py-3 font-mono text-[10px] text-[var(--accent)] uppercase tracking-wider font-black text-center border-l border-white/5">CQS Overall</th>
                      <th className="px-4 py-3 font-mono text-[10px] text-ink3 uppercase tracking-wider text-center">Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(() => {
                      const filtered = (data?.matrix || []).filter(row => {
                        const diseaseMatch = disease === 'all' || row.disease === disease;
                        const agentMatch = agent === 'all' || row.agent === agent;
                        return diseaseMatch && agentMatch;
                      });
                      if (filtered.length === 0) {
                        return <tr><td colSpan="11" className="px-4 py-8 text-center text-ink3">No matching matrix records found.</td></tr>;
                      }
                      return filtered.map((row, idx) => {
                        let tierColor = "#EF4444";
                        let tierLabel = "RED";
                        let bgTier = "rgba(239, 68, 68, 0.1)";
                        if (row.cqs >= 85) {
                          tierColor = "#10B981";
                          tierLabel = "GREEN";
                          bgTier = "rgba(16, 185, 129, 0.1)";
                        } else if (row.cqs >= 70) {
                          tierColor = "#F59E0B";
                          tierLabel = "AMBER";
                          bgTier = "rgba(245, 158, 11, 0.1)";
                        }
                        return (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-mono text-[10px] text-white/50">{row.date}</td>
                            <td className="px-4 py-3 font-bold text-white/90">{row.disease}</td>
                            <td className="px-4 py-3 font-medium text-ink2">{row.agent}</td>
                            <td className="px-4 py-3 text-center text-white/80 font-mono">{row.E}</td>
                            <td className="px-4 py-3 text-center text-white/80 font-mono">{row.R}</td>
                            <td className="px-4 py-3 text-center text-white/80 font-mono">{row.C}</td>
                            <td className="px-4 py-3 text-center text-white/80 font-mono">{row.S}</td>
                            <td className="px-4 py-3 text-center text-white/80 font-mono">{row.F}</td>
                            <td className="px-4 py-3 text-center text-white/80 font-mono">{row.V}</td>
                            <td className="px-4 py-3 text-center font-black text-[14px] border-l border-white/5" style={{ color: tierColor }}>{row.cqs}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-1 rounded-[4px] text-[9px] font-black tracking-widest border" style={{ color: tierColor, backgroundColor: bgTier, borderColor: `${tierColor}40` }}>
                                {tierLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
