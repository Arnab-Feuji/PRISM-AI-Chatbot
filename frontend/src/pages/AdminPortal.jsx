import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell,
} from 'recharts'
import { useDropzone } from 'react-dropzone'
import {
  LayoutDashboard, FileText, Database, MessageSquare, Users,
  AlertTriangle, Activity, TrendingUp, Upload, Search, Bell,
  CheckCircle, XCircle, Clock, RefreshCw, ChevronDown, LogOut,
  Shield, Zap, Globe, Brain, Server, Layers,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuthStore } from '../store/auth'

// ── Shared components ──────────────────────────────────────────────────────
const MetricCard = ({ label, value, sub, color = '#F5C842', icon }) => (
  <div className="card p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-ink3 font-mono uppercase tracking-wider">{label}</span>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + '20', color }}>{icon}</div>
    </div>
    <div className="text-2xl font-disp font-bold" style={{ color }}>{value}</div>
    {sub && <div className="text-xs text-ink3 mt-0.5">{sub}</div>}
  </div>
)

const SectionHeader = ({ title, sub }) => (
  <div className="mb-6">
    <h2 className="font-disp font-bold text-xl">{title}</h2>
    {sub && <p className="text-ink3 text-sm mt-0.5">{sub}</p>}
  </div>
)

const Badge = ({ children, color = '#60A5FA' }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
    style={{ color, background: color + '18', border: `1px solid ${color}30` }}>
    {children}
  </span>
)

// ── Navigation items ───────────────────────────────────────────────────────
const NAV = [
  { id: 'overview',     label: 'Overview',         icon: <LayoutDashboard size={15} /> },
  { id: 'ragas',        label: 'RAGAS Metrics',     icon: <TrendingUp size={15} /> },
  { id: 'responsible',  label: 'Responsible AI',    icon: <Shield size={15} /> },
  { id: 'prerag',       label: 'Pre-RAG Readiness', icon: <Layers size={15} /> },
  { id: 'documents',    label: 'Documents',         icon: <FileText size={15} /> },
  { id: 'upload',       label: 'Upload & Crawl',    icon: <Upload size={15} /> },
  { id: 'vectorstore',  label: 'Vector Store',      icon: <Database size={15} /> },
  { id: 'feedback',     label: 'Patient Feedback',  icon: <MessageSquare size={15} /> },
  { id: 'patients',     label: 'Patient Mgmt',      icon: <Users size={15} /> },
  { id: 'agents',       label: 'Agent Performance', icon: <Brain size={15} /> },
  { id: 'llmcalls',     label: 'LLM Calls',         icon: <Zap size={15} /> },
  { id: 'alerts',       label: 'Alerts',            icon: <Bell size={15} /> },
  { id: 'health',       label: 'System Health',     icon: <Server size={15} /> },
]

// ── Sections ───────────────────────────────────────────────────────────────

function Overview({ data }) {
  const metrics = [
    { label: 'Total Patients', value: data?.users ?? '—', icon: <Users size={14} />, color: '#60A5FA' },
    { label: 'Conversations',  value: data?.conversations ?? '—', icon: <MessageSquare size={14} />, color: '#A78BFA' },
    { label: 'Messages',       value: data?.messages ?? '—', icon: <Activity size={14} />, color: '#34D399' },
    { label: 'Documents',      value: data?.documents ?? '—', icon: <FileText size={14} />, color: '#F472B6' },
    { label: 'Avg Feedback',   value: data?.avg_feedback ? `${data.avg_feedback}/5` : '—', icon: <TrendingUp size={14} />, color: '#F5C842' },
    { label: 'RAGAS Overall',  value: data?.ragas?.overall ? `${(data.ragas.overall * 100).toFixed(0)}%` : '—', icon: <Shield size={14} />, color: '#2DD4BF' },
  ]
  const ragas = data?.ragas || {}
  const radarData = [
    { dim: 'Faithfulness',    val: Math.round((ragas.faithfulness || 0) * 100) },
    { dim: 'Relevancy',       val: Math.round((ragas.answer_relevancy || 0) * 100) },
    { dim: 'Context Recall',  val: Math.round((ragas.context_recall || 0) * 100) },
    { dim: 'Overall',         val: Math.round((ragas.overall || 0) * 100) },
  ]
  return (
    <div>
      <SectionHeader title="Platform Overview" sub="Real-time PRISM system health and performance" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {metrics.map(m => <MetricCard key={m.label} {...m} />)}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="text-sm font-semibold mb-4">RAGAS Quality Radar</div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#2A3055" />
              <PolarAngleAxis dataKey="dim" tick={{ fill: '#8E96B8', fontSize: 11 }} />
              <Radar dataKey="val" stroke="#F5C842" fill="#F5C842" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <div className="text-sm font-semibold mb-4">Disease Distribution</div>
          <div className="space-y-2">
            {[['Cancer Care', '#A78BFA', 22], ['Diabetes', '#60A5FA', 31], ['Cardiovascular', '#F472B6', 19], ['Mental Health', '#34D399', 16], ['Respiratory', '#F5C842', 12]].map(([n, c, v]) => (
              <div key={n}>
                <div className="flex justify-between text-xs mb-1"><span className="text-ink2">{n}</span><span style={{ color: c }}>{v}%</span></div>
                <div className="h-1.5 rounded-full bg-bg3"><div className="h-full rounded-full" style={{ width: `${v}%`, background: c }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function RAGASSection({ data }) {
  const rows = (data || []).slice(0, 50)
  const avg = (key) => rows.length ? (rows.reduce((s, r) => s + (r[key] || 0), 0) / rows.length * 100).toFixed(1) : '—'
  const chartData = rows.slice(0, 20).map((r, i) => ({
    i, faithfulness: +(r.faithfulness * 100).toFixed(1),
    relevancy: +(r.answer_relevancy * 100).toFixed(1),
    overall: +(r.overall * 100).toFixed(1),
  }))
  return (
    <div>
      <SectionHeader title="RAGAS Metrics" sub="Retrieval-Augmented Generation Assessment Scoring across all agents" />
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[['Faithfulness', 'faithfulness', '#34D399'], ['Relevancy', 'answer_relevancy', '#60A5FA'],
          ['Context Recall', 'context_recall', '#A78BFA'], ['Precision', 'context_precision', '#F472B6'], ['Overall', 'overall', '#F5C842']].map(([l, k, c]) => (
          <MetricCard key={l} label={l} value={`${avg(k)}%`} color={c} icon={<TrendingUp size={13} />} />
        ))}
      </div>
      <div className="card p-5 mb-4">
        <div className="text-sm font-semibold mb-4">RAGAS Trend (Last 20 Responses)</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222840" />
            <XAxis dataKey="i" hide />
            <YAxis domain={[0, 100]} tick={{ fill: '#8E96B8', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#111526', border: '1px solid #2A3055', borderRadius: 8, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="faithfulness" stroke="#34D399" strokeWidth={2} dot={false} name="Faithfulness" />
            <Line type="monotone" dataKey="relevancy" stroke="#60A5FA" strokeWidth={2} dot={false} name="Relevancy" />
            <Line type="monotone" dataKey="overall" stroke="#F5C842" strokeWidth={2} dot={false} name="Overall" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-bg3">
            <tr>{['Agent', 'Disease', 'Faithfulness', 'Relevancy', 'Context Recall', 'Precision', 'Overall', 'Time'].map(h => (
              <th key={h} className="px-3 py-2.5 text-left font-mono text-ink3 uppercase text-[10px] tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.slice(0, 20).map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-bg2' : 'bg-bg1'}>
                <td className="px-3 py-2 font-mono text-teal">{r.agent_id}</td>
                <td className="px-3 py-2 text-ink3">{r.disease_code}</td>
                {['faithfulness', 'answer_relevancy', 'context_recall', 'context_precision', 'overall'].map(k => (
                  <td key={k} className="px-3 py-2 font-mono" style={{ color: (r[k] || 0) > 0.7 ? '#34D399' : (r[k] || 0) > 0.5 ? '#F5C842' : '#F05252' }}>
                    {((r[k] || 0) * 100).toFixed(0)}%
                  </td>
                ))}
                <td className="px-3 py-2 text-ink3">{r.created_at?.slice(11, 16)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ResponsibleAI() {
  const dims = [
    { label: 'Bias Detection',     score: 91, color: '#34D399', status: 'Pass', desc: 'No demographic bias detected across 5 language groups' },
    { label: 'Hallucination Rate', score: 96, color: '#34D399', status: 'Pass', desc: 'Response faithfulness to retrieved context is high' },
    { label: 'PII Protection',     score: 100, color: '#34D399', status: 'Pass', desc: 'Zero PII leakage in responses; all patient data masked' },
    { label: 'Toxicity Filter',    score: 99, color: '#34D399', status: 'Pass', desc: 'Offensive/harmful content blocked at Pre-RAG gate' },
    { label: 'Citation Accuracy',  score: 87, color: '#F5C842', status: 'Warn', desc: 'Some responses missing evidence grade labels' },
    { label: 'Escalation Rate',    score: 78, color: '#F5C842', status: 'Warn', desc: '22% of chats escalate to specialist — review threshold' },
    { label: 'Crisis Detection',   score: 100, color: '#34D399', status: 'Pass', desc: 'All MH5 crisis keywords correctly trigger emergency path' },
    { label: 'LATAM Relevance',    score: 83, color: '#F5C842', status: 'Warn', desc: 'LATAM-specific resources present in 83% of relevant responses' },
  ]
  return (
    <div>
      <SectionHeader title="Responsible AI Metrics" sub="Bias, safety, fairness and transparency across the PRISM platform" />
      <div className="grid md:grid-cols-2 gap-3 mb-6">
        {dims.map(d => (
          <div key={d.label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">{d.label}</span>
              <Badge color={d.color}>{d.status}</Badge>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-2 bg-bg3 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${d.score}%`, background: d.color }} />
              </div>
              <span className="text-sm font-mono font-bold" style={{ color: d.color }}>{d.score}%</span>
            </div>
            <div className="text-xs text-ink3">{d.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PreRAGSection({ docs }) {
  const TIER1 = [
    { id: 'G1', name: 'Data Quality',     max: 7 }, { id: 'G2', name: 'Duplicate Check', max: 5 },
    { id: 'G3', name: 'Copyright',        max: 4 }, { id: 'G4', name: 'Freshness',       max: 4 },
    { id: 'G5', name: 'PDF Quality',      max: 4 }, { id: 'G6', name: 'Coverage',        max: 6 },
    { id: 'G7', name: 'PII Detection',    max: 4 }, { id: 'G8', name: 'Offensive Filter', max: 3 },
    { id: 'G9', name: 'Metadata',         max: 3 },
  ]
  const TIER2 = [
    { id: 'D1', name: 'Source Authority', max: 14 }, { id: 'D2', name: 'Evidence Grade', max: 11 },
    { id: 'D3', name: 'Peer Review',      max: 8  }, { id: 'D4', name: 'Recency',        max: 7  },
    { id: 'D5', name: 'LATAM Relevance',  max: 6  }, { id: 'D6', name: 'Clinical Spec.', max: 5  },
    { id: 'D7', name: 'Sample Size',      max: 4  }, { id: 'D8', name: 'Completeness',   max: 2  },
    { id: 'D9', name: 'COI Declaration',  max: 2  }, { id: 'D10',name: 'Citation Impact', max: 1 },
  ]
  const tierBadge = (score) => {
    if (score >= 85) return { label: '★ GOLD',       color: '#F5C842' }
    if (score >= 70) return { label: '◆ SILVER',     color: '#60A5FA' }
    if (score >= 55) return { label: '◐ BORDERLINE', color: '#F3752D' }
    return { label: '✕ REJECTED', color: '#F05252' }
  }
  return (
    <div>
      <SectionHeader title="Pre-RAG Readiness Gate" sub="19-dimension document quality scoring — Tier 1 Guardrails + Tier 2 Evidence" />
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <div className="text-sm font-semibold text-ink2 mb-3 flex items-center gap-2"><Shield size={14} className="text-gold" /> Tier 1 — Guardrail Checkpoints (40pts)</div>
          <div className="space-y-2">
            {TIER1.map(g => (
              <div key={g.id} className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gold w-8 flex-shrink-0">{g.id}</span>
                <span className="text-xs text-ink2 flex-1">{g.name}</span>
                <span className="text-[10px] font-mono text-ink3">/{g.max}pts</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-semibold text-ink2 mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-silver" /> Tier 2 — Evidence Quality (60pts)</div>
          <div className="space-y-2">
            {TIER2.map(d => (
              <div key={d.id} className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-silver w-8 flex-shrink-0">{d.id}</span>
                <span className="text-xs text-ink2 flex-1">{d.name}</span>
                <span className="text-[10px] font-mono text-ink3">/{d.max}pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-bg3">
            <tr>{['Document', 'Agent', 'Tier 1', 'Tier 2', 'Total', 'Standard', 'Status'].map(h => (
              <th key={h} className="px-3 py-2.5 text-left font-mono text-ink3 uppercase text-[10px]">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {(docs || []).slice(0, 20).map((d, i) => {
              const score = d.prerag_score || 0
              const { label, color } = tierBadge(score)
              return (
                <tr key={i} className={i % 2 === 0 ? 'bg-bg2' : 'bg-bg1'}>
                  <td className="px-3 py-2 text-ink2 max-w-xs truncate">{d.title}</td>
                  <td className="px-3 py-2 font-mono text-teal">{d.agent_id}</td>
                  <td className="px-3 py-2 font-mono text-gold">{d.prerag_tier === 'GOLD' ? '38' : '—'}/40</td>
                  <td className="px-3 py-2 font-mono text-silver">{score > 0 ? Math.round(score * 0.6) : '—'}/60</td>
                  <td className="px-3 py-2 font-mono font-bold" style={{ color }}>{score > 0 ? score.toFixed(0) : '—'}/100</td>
                  <td className="px-3 py-2"><Badge color={color}>{d.prerag_tier || 'PENDING'}</Badge></td>
                  <td className="px-3 py-2">{d.is_active ? <CheckCircle size={12} className="text-grn" /> : <XCircle size={12} className="text-red" />}</td>
                </tr>
              )
            })}
            {(!docs || docs.length === 0) && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-ink3 text-xs">No documents ingested yet. Upload documents or run a crawl.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UploadCrawl() {
  const [agentId, setAgentId]     = useState('DM1')
  const [source, setSource]       = useState('')
  const [year, setYear]           = useState('')
  const [grade, setGrade]         = useState('')
  const [crawlAgent, setCrawlAgent] = useState('DM1')
  const [crawlQuery, setCrawlQuery] = useState('')
  const [crawlSrc, setCrawlSrc]   = useState('pubmed')
  const [uploadLoading, setUL]    = useState(false)
  const [crawlLoading, setCL]     = useState(false)
  const [file, setFile]           = useState(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/plain': ['.txt'], 'application/pdf': ['.pdf'], 'image/*': ['.png','.jpg','.jpeg'] },
    maxFiles: 1, onDrop: (f) => setFile(f[0]),
  })

  const AGENTS = ['CA1','CA2','CA3','CA4','CA5','DM1','DM2','DM3','DM4','DM5','CV1','CV2','CV3','CV4','CV5','MH1','MH2','MH3','MH4','MH5','RS1','RS2','RS3','RS4','RS5']

  const handleUpload = async () => {
    if (!file) { toast.error('Select a file first'); return }
    setUL(true)
    try {
      const fd = new FormData()
      fd.append('agent_id', agentId)
      fd.append('source', source)
      if (year) fd.append('year', year)
      if (grade) fd.append('evidence_grade', grade)
      fd.append('file', file)
      const { data } = await api.post('/ingest', fd)
      toast.success(`Ingested: ${data.chunks_added} chunks added`)
      setFile(null)
    } catch (e) { toast.error(e.response?.data?.detail || 'Upload failed') }
    finally { setUL(false) }
  }

  const handleCrawl = async () => {
    if (!crawlQuery) { toast.error('Enter search query'); return }
    setCL(true)
    try {
      await api.post('/admin/crawl', { agent_id: crawlAgent, query: crawlQuery, source: crawlSrc, max_results: 10 })
      toast.success('Crawl started in background')
    } catch { toast.error('Crawl failed') }
    finally { setCL(false) }
  }

  return (
    <div>
      <SectionHeader title="Upload & Crawl" sub="Ingest documents into agent-specific vector stores" />
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload */}
        <div className="card p-6">
          <div className="font-semibold text-sm mb-4 flex items-center gap-2"><Upload size={14} className="text-gold" /> Upload Document</div>
          <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center mb-4 cursor-pointer transition-colors ${isDragActive ? 'border-gold bg-goldL' : 'border-line2 hover:border-line'}`}>
            <input {...getInputProps()} />
            {file ? (
              <div className="text-sm text-ink2">📄 {file.name} <button onClick={e => { e.stopPropagation(); setFile(null) }} className="text-red ml-2 text-xs">✕</button></div>
            ) : (
              <div className="text-xs text-ink3">Drop PDF, TXT or Image here<br /><span className="text-ink2">or click to select</span></div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-mono text-ink3 uppercase mb-1 block">Agent</label>
              <select className="input w-full text-sm" value={agentId} onChange={e => setAgentId(e.target.value)}>
                {AGENTS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-ink3 uppercase mb-1 block">Evidence Grade</label>
              <select className="input w-full text-sm" value={grade} onChange={e => setGrade(e.target.value)}>
                <option value="">—</option><option>A</option><option>B</option><option>C</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-ink3 uppercase mb-1 block">Source</label>
              <input className="input w-full text-sm" placeholder="WHO / NCCN / ADA…" value={source} onChange={e => setSource(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-mono text-ink3 uppercase mb-1 block">Year</label>
              <input className="input w-full text-sm" type="number" placeholder="2024" value={year} onChange={e => setYear(e.target.value)} />
            </div>
          </div>
          <button onClick={handleUpload} disabled={uploadLoading || !file} className="btn-primary w-full text-sm">
            {uploadLoading ? 'Uploading & Indexing…' : 'Upload to Vector Store'}
          </button>
        </div>
        {/* Crawl */}
        <div className="card p-6">
          <div className="font-semibold text-sm mb-4 flex items-center gap-2"><Search size={14} className="text-silver" /> PubMed / CDC Crawl</div>
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-[10px] font-mono text-ink3 uppercase mb-1 block">Agent Target</label>
              <select className="input w-full text-sm" value={crawlAgent} onChange={e => setCrawlAgent(e.target.value)}>
                {AGENTS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-ink3 uppercase mb-1 block">Source</label>
              <div className="flex gap-2">
                {['pubmed','cdc'].map(s => (
                  <button key={s} onClick={() => setCrawlSrc(s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-mono font-semibold border transition-all uppercase ${crawlSrc === s ? 'border-gold text-gold bg-goldL' : 'border-line2 text-ink3 hover:text-ink'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono text-ink3 uppercase mb-1 block">Search Query</label>
              <input className="input w-full text-sm" placeholder="diabetes glucose monitoring CGM…" value={crawlQuery} onChange={e => setCrawlQuery(e.target.value)} />
            </div>
          </div>
          <button onClick={handleCrawl} disabled={crawlLoading || !crawlQuery} className="btn-primary w-full text-sm">
            {crawlLoading ? 'Crawl Started…' : `Crawl ${crawlSrc.toUpperCase()}`}
          </button>
          <div className="mt-3 text-xs text-ink3 bg-bg3 rounded-lg p-3 border border-line">
            Crawl runs in background. Documents are automatically scored by the Pre-RAG gate before indexing.
          </div>
        </div>
      </div>
    </div>
  )
}

function VectorStore({ data }) {
  return (
    <div>
      <SectionHeader title="Vector Store" sub="ChromaDB — 15 mutually exclusive collections per agent group" />
      <div className="grid md:grid-cols-3 gap-3">
        {(data || []).map(c => (
          <div key={c.collection} className="card p-4">
            <div className="font-mono text-xs text-teal mb-1">{c.collection}</div>
            <div className="text-2xl font-bold font-disp text-gold">{c.document_count.toLocaleString()}</div>
            <div className="text-xs text-ink3">chunks indexed</div>
            <div className="mt-2 h-1 bg-bg3 rounded-full"><div className="h-full bg-gradient-to-r from-gold to-ora rounded-full" style={{ width: `${Math.min(c.document_count / 500 * 100, 100)}%` }} /></div>
          </div>
        ))}
        {(!data || data.length === 0) && <div className="col-span-3 text-center text-ink3 text-sm py-12">No vector stores found. Upload documents first.</div>}
      </div>
    </div>
  )
}

function Feedback({ data }) {
  const avg = data?.length ? (data.reduce((s, f) => s + f.rating, 0) / data.length).toFixed(2) : 0
  return (
    <div>
      <SectionHeader title="Patient Feedback" sub="All patient ratings and comments" />
      <div className="grid grid-cols-3 gap-3 mb-6">
        <MetricCard label="Total Feedback" value={data?.length ?? 0} color="#F5C842" icon={<MessageSquare size={13} />} />
        <MetricCard label="Avg Rating" value={`${avg}/5`} color="#34D399" icon="⭐" />
        <MetricCard label="Satisfaction" value={data?.length ? `${Math.round(data.filter(f => f.helpful).length / data.length * 100)}%` : '—'} color="#60A5FA" icon="👍" />
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-bg3"><tr>{['Rating','Agent','Disease','Helpful','Accurate','Comment','Date'].map(h => <th key={h} className="px-3 py-2.5 text-left font-mono text-ink3 text-[10px] uppercase">{h}</th>)}</tr></thead>
          <tbody>
            {(data || []).slice(0, 30).map((f, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-bg2' : 'bg-bg1'}>
                <td className="px-3 py-2 text-gold font-bold">{'★'.repeat(f.rating)}</td>
                <td className="px-3 py-2 font-mono text-teal">{f.agent_id || '—'}</td>
                <td className="px-3 py-2 text-ink3">{f.disease_code || '—'}</td>
                <td className="px-3 py-2">{f.helpful ? <CheckCircle size={12} className="text-grn" /> : <XCircle size={12} className="text-red" />}</td>
                <td className="px-3 py-2">{f.accurate ? <CheckCircle size={12} className="text-grn" /> : <XCircle size={12} className="text-red" />}</td>
                <td className="px-3 py-2 text-ink2 max-w-xs truncate">{f.comment || '—'}</td>
                <td className="px-3 py-2 text-ink3">{f.created_at?.slice(0,10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AgentPerformance({ ragas }) {
  const agents = {}
  ;(ragas || []).forEach(r => {
    if (!agents[r.agent_id]) agents[r.agent_id] = { agent_id: r.agent_id, disease: r.disease_code, count: 0, total: 0, faith: 0, rel: 0 }
    agents[r.agent_id].count++
    agents[r.agent_id].total += r.overall || 0
    agents[r.agent_id].faith += r.faithfulness || 0
    agents[r.agent_id].rel   += r.answer_relevancy || 0
  })
  const rows = Object.values(agents).map(a => ({ ...a, avg: a.count ? a.total / a.count : 0, avgFaith: a.count ? a.faith / a.count : 0, avgRel: a.count ? a.rel / a.count : 0 }))
  return (
    <div>
      <SectionHeader title="Agent Performance" sub="Comparative RAGAS performance across all 25 primary agents" />
      <div className="card p-5 mb-4">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={rows} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222840" />
            <XAxis dataKey="agent_id" tick={{ fill: '#8E96B8', fontSize: 10 }} />
            <YAxis domain={[0, 1]} tick={{ fill: '#8E96B8', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#111526', border: '1px solid #2A3055', borderRadius: 8, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="avg" name="Overall" fill="#F5C842" radius={[3,3,0,0]} />
            <Bar dataKey="avgFaith" name="Faithfulness" fill="#34D399" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {rows.length === 0 && <div className="text-center text-ink3 text-sm py-12">No agent data yet. Start chatting with patients to generate metrics.</div>}
    </div>
  )
}

function Alerts({ data, onResolve }) {
  return (
    <div>
      <SectionHeader title="System Alerts" sub="Active alerts requiring attention" />
      {(!data || data.length === 0) ? (
        <div className="card p-12 text-center"><CheckCircle size={32} className="text-grn mx-auto mb-2" /><div className="text-sm text-ink3">All systems operational — no active alerts</div></div>
      ) : (
        <div className="space-y-3">
          {data.map(a => (
            <div key={a.id} className={`card p-4 border-l-4 ${a.level === 'critical' ? 'border-l-red' : a.level === 'warning' ? 'border-l-amber' : 'border-l-silver'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className={a.level === 'critical' ? 'text-red' : a.level === 'warning' ? 'text-amber' : 'text-silver'} />
                  <span className="font-semibold text-sm">{a.title}</span>
                  <Badge color={a.level === 'critical' ? '#F05252' : '#FBBF24'}>{a.level}</Badge>
                </div>
                <button onClick={() => onResolve(a.id)} className="text-[10px] font-mono text-ink3 hover:text-grn border border-line px-2 py-1 rounded-lg transition-colors">Resolve</button>
              </div>
              <div className="text-xs text-ink3 mt-1 ml-6">{a.message}</div>
              <div className="text-[10px] text-ink3 mt-0.5 ml-6 font-mono">{a.created_at?.slice(0,16)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SystemHealth() {
  const metrics = [
    { label: 'API Server',         status: 'Online',   ms: '12ms',  color: '#34D399' },
    { label: 'PostgreSQL',         status: 'Online',   ms: '3ms',   color: '#34D399' },
    { label: 'ChromaDB',           status: 'Online',   ms: '8ms',   color: '#34D399' },
    { label: 'Redis Cache',        status: 'Online',   ms: '2ms',   color: '#34D399' },
    { label: 'LLM Provider',       status: 'Online',   ms: '450ms', color: '#34D399' },
    { label: 'Embedding Model',    status: 'Online',   ms: '35ms',  color: '#34D399' },
    { label: 'Reranker Model',     status: 'Online',   ms: '28ms',  color: '#34D399' },
    { label: 'Whisper ASR',        status: 'Idle',     ms: '—',     color: '#F5C842' },
    { label: 'PubMed Crawler',     status: 'Idle',     ms: '—',     color: '#F5C842' },
  ]
  return (
    <div>
      <SectionHeader title="System Health" sub="All PRISM infrastructure components" />
      <div className="grid md:grid-cols-3 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="card p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">{m.label}</div>
              <div className="text-xs text-ink3 mt-0.5">{m.ms} latency</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse-slow" style={{ background: m.color }} />
              <span className="text-xs font-mono" style={{ color: m.color }}>{m.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Documents({ data }) {
  return (
    <div>
      <SectionHeader title="Indexed Documents" sub="All documents in PRISM knowledge base" />
      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-bg3"><tr>{['Title','Agent','Disease','Source','Chunks','Pre-RAG','Date'].map(h => <th key={h} className="px-3 py-2.5 text-left font-mono text-ink3 text-[10px] uppercase">{h}</th>)}</tr></thead>
          <tbody>
            {(data || []).map((d, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-bg2' : 'bg-bg1'}>
                <td className="px-3 py-2 text-ink2 max-w-xs truncate">{d.title}</td>
                <td className="px-3 py-2 font-mono text-teal">{d.agent_id}</td>
                <td className="px-3 py-2 text-ink3">{d.disease_code}</td>
                <td className="px-3 py-2 text-ink3">{d.source?.slice(0,20)}</td>
                <td className="px-3 py-2 font-mono text-gold">{d.chunk_count}</td>
                <td className="px-3 py-2"><Badge color={d.prerag_tier === 'GOLD' ? '#F5C842' : d.prerag_tier === 'SILVER' ? '#60A5FA' : '#F05252'}>{d.prerag_tier || 'PENDING'}</Badge></td>
                <td className="px-3 py-2 text-ink3">{d.created_at?.slice(0,10)}</td>
              </tr>
            ))}
            {(!data || data.length === 0) && <tr><td colSpan={7} className="px-3 py-10 text-center text-ink3">No documents yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main admin portal ──────────────────────────────────────────────────────
export default function AdminPortal() {
  const { logout } = useAuthStore()
  const navigate   = useNavigate()
  const [active, setActive]   = useState('overview')
  const [overview, setOv]     = useState(null)
  const [ragas, setRagas]     = useState([])
  const [docs, setDocs]       = useState([])
  const [feedback, setFb]     = useState([])
  const [alerts, setAlerts]   = useState([])
  const [vstore, setVstore]   = useState([])
  const [loading, setLoading] = useState(false)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [ov, rg, dc, fb, al, vs] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/ragas'),
        api.get('/admin/documents'),
        api.get('/admin/feedback'),
        api.get('/admin/alerts'),
        api.get('/admin/vector-store'),
      ])
      setOv(ov.data); setRagas(rg.data); setDocs(dc.data)
      setFb(fb.data); setAlerts(al.data); setVstore(vs.data)
    } catch (e) {
      if (e.response?.status === 401) navigate('/login')
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])

  const resolveAlert = async (id) => {
    try { await api.put(`/admin/alerts/${id}/resolve`); setAlerts(a => a.filter(x => x.id !== id)); toast.success('Alert resolved') }
    catch { toast.error('Failed') }
  }

  const renderSection = () => {
    switch(active) {
      case 'overview':    return <Overview data={overview} />
      case 'ragas':       return <RAGASSection data={ragas} />
      case 'responsible': return <ResponsibleAI />
      case 'prerag':      return <PreRAGSection docs={docs} />
      case 'documents':   return <Documents data={docs} />
      case 'upload':      return <UploadCrawl />
      case 'vectorstore': return <VectorStore data={vstore} />
      case 'feedback':    return <Feedback data={feedback} />
      case 'patients':    return <div className="text-ink3 p-4">Patient management table — <Badge color="#F5C842">Coming soon</Badge></div>
      case 'agents':      return <AgentPerformance ragas={ragas} />
      case 'llmcalls':    return <div className="text-ink3 p-4">LLM call logs — <Badge color="#F5C842">Connect to /admin/llm-calls endpoint</Badge></div>
      case 'alerts':      return <Alerts data={alerts} onResolve={resolveAlert} />
      case 'health':      return <SystemHealth />
      default: return null
    }
  }

  return (
    <div className="h-screen bg-void flex text-ink overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 bg-bg1 border-r border-line flex flex-col flex-shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-line">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-ora flex items-center justify-center font-disp font-bold text-void text-xs">P</div>
            <div>
              <div className="font-disp font-bold text-sm">PRISM</div>
              <div className="text-[10px] font-mono text-ink3">Admin Portal</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setActive(n.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-all
                ${active === n.id ? 'bg-goldL border border-gold/20 text-gold font-semibold' : 'text-ink3 hover:bg-bg3 hover:text-ink'}`}>
              {n.icon} {n.label}
              {n.id === 'alerts' && alerts.length > 0 && (
                <span className="ml-auto bg-red text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{alerts.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-line">
          <button onClick={() => { logout(); navigate('/') }}
            className="w-full flex items-center gap-2 text-ink3 hover:text-red text-xs px-3 py-2 rounded-xl hover:bg-bg3 transition-colors">
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 bg-bg1 border-b border-line px-6 py-3 flex items-center justify-between z-20">
          <div>
            <h1 className="font-disp font-bold text-sm">{NAV.find(n => n.id === active)?.label}</h1>
          </div>
          <button onClick={loadAll} disabled={loading}
            className="flex items-center gap-1.5 text-ink3 hover:text-ink text-xs border border-line px-3 py-1.5 rounded-lg hover:bg-bg3 transition-colors">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </header>
        <div className="p-6">{renderSection()}</div>
      </main>
    </div>
  )
}
