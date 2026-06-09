import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, ShieldCheck, Layers, MessageSquare, 
  UploadCloud, Brain, Users, Zap, Bell, 
  Activity, LifeBuoy, CheckCircle, ArrowRight, Target
} from 'lucide-react';

const metrics = [
  {
    title: "RAGAS Metrics",
    description: "Retrieval-Augmented Generation Assessment Scoring to evaluate faithfulness, answer relevance, and context recall.",
    icon: <TrendingUp className="text-pink-500" size={24} />,
    color: "from-pink-500/20 to-transparent"
  },
  {
    title: "Governance & Security",
    description: "RBAC protocols and clinical disclaimer compliance monitoring",
    icon: <ShieldCheck className="text-[var(--accent)]" size={24} />,
    color: "from-[var(--accent)]/20 to-transparent"
  },
  {
    title: "Pre-RAG Readiness",
    description: "A 19-dimension document quality scoring system ensuring data integrity before indexing.",
    icon: <Layers className="text-orange-500" size={24} />,
    color: "from-orange-500/20 to-transparent"
  },
  {
    title: "Patient Feedback",
    description: "Aggregated patient sentiment, ratings, and qualitative feedback for continuous improvement.",
    icon: <MessageSquare className="text-green-500" size={24} />,
    color: "from-green-500/20 to-transparent"
  },
  {
    title: "Upload & Crawl",
    description: "Dynamic ingestion pipeline for medical documents and automated web crawling from PubMed and CDC.",
    icon: <UploadCloud className="text-purple-500" size={24} />,
    color: "from-purple-500/20 to-transparent"
  },
  {
    title: "Agent Performance",
    description: "Comparative analysis of performance metrics across all 25 disease-specific primary agents.",
    icon: <Brain className="text-pink-400" size={24} />,
    color: "from-pink-400/20 to-transparent"
  },
  {
    title: "Agent Registry",
    description: "Detailed hierarchy and management of primary agents, specialists, and human escalation paths.",
    icon: <Users className="text-indigo-500" size={24} />,
    color: "from-indigo-500/20 to-transparent"
  },
  {
    title: "LLM Calls",
    description: "Real-time telemetry and logging for every large language model interaction and token usage.",
    icon: <Zap className="text-yellow-500" size={24} />,
    color: "from-yellow-500/20 to-transparent"
  },
  {
    title: "Alerts",
    description: "Proactive system monitoring and critical alerts for immediate operational response.",
    icon: <Bell className="text-red-500" size={24} />,
    color: "from-red-500/20 to-transparent"
  },
  {
    title: "PRISM Health",
    description: "Real-time infrastructure health monitoring for APIs, databases, and model providers.",
    icon: <Activity className="text-teal-500" size={24} />,
    color: "from-teal-500/20 to-transparent"
  },
  {
    title: "Escalation Summary",
    description: "Tracking and analysis of patient escalations to human specialists and medical teams.",
    icon: <LifeBuoy className="text-orange-400" size={24} />,
    color: "from-orange-400/20 to-transparent"
  },
  {
    title: "Quality Score",
    description: "Advanced metrics evaluating the clinical accuracy and empathy of patient interactions.",
    icon: <CheckCircle className="text-emerald-500" size={24} />,
    color: "from-emerald-500/20 to-transparent"
  },
  {
    title: "Recommendation 360° View",
    description: "AI-driven action plan synthesizing RAGAS, feedback, alerts, escalations, and quality metrics to boost patient satisfaction.",
    icon: <Target className="text-[var(--accent)]" size={24} />,
    color: "from-[var(--accent)]/20 to-transparent"
  }
];

export default function AdminIntro() {
  const navigate = useNavigate();

  return (
    <div className="relative w-full min-h-full bg-[var(--bg-main)] text-[var(--text-main)] font-sans selection:bg-[var(--accent)]/30">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--accent)]/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--accent)]/5 blur-[150px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 pb-28">
        {/* Hero — compact */}
        <div className="text-center mb-4 sm:mb-5">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter uppercase flex flex-wrap justify-center gap-x-3 text-[var(--text-main)]">
            <span>PRISM</span>
            <span className="text-[var(--accent)]">Intelligence</span>
          </h2>
          <p className="text-[var(--text-dim)] text-xs sm:text-sm max-w-2xl mx-auto leading-snug font-medium mt-2">
            Real-time governance oversight for the PRISM clinical platform.
            Access dimension-level metrics and system control via the Command Centre.
          </p>
        </div>

        {/* Metrics grid — denser cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-2.5 w-full">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="group relative p-2.5 sm:p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-[var(--accent)]/50 transition-all duration-300 backdrop-blur-md overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${metric.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative z-10">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-white/5 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform border border-white/5">
                  {React.cloneElement(metric.icon, { size: 16, className: 'text-[var(--accent)]' })}
                </div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide mb-1 group-hover:text-[var(--accent)] transition-colors text-[var(--text-main)] leading-tight">
                  {metric.title}
                </h3>
                <p className="text-[var(--text-dim)] text-[10px] sm:text-xs leading-snug line-clamp-2 font-medium">
                  {metric.description}
                </p>
              </div>
              <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-[var(--grad-primary)] group-hover:w-full transition-all duration-500" />
            </div>
          ))}
        </div>
      </div>

      {/* Sticky CTA — always visible above fold / when scrolling */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex flex-col items-center gap-2 px-4 py-3 sm:py-4 border-t border-white/10 bg-[var(--bg-main)]/95 backdrop-blur-md">
        <button
          onClick={() => navigate('/admin')}
          className="group relative px-8 sm:px-10 py-2.5 sm:py-3 rounded-full bg-[var(--grad-primary)] text-white font-black text-[10px] sm:text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-[var(--accent)]/30 overflow-hidden uppercase tracking-widest"
        >
          <span className="relative z-10 flex items-center gap-2">
            Launch Command Centre
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </span>
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
        </button>
        <p className="text-[var(--text-dim)] text-[7px] sm:text-[8px] uppercase tracking-[0.25em] font-black">
          Authorized Access Only • Live Data Pipeline
        </p>
      </div>
    </div>
  );
}
