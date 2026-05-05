import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useDropzone } from 'react-dropzone'
import { Send, Mic, MicOff, Paperclip, ChevronDown, ChevronUp,
         BookOpen, Star, LogOut, Settings, Globe, RefreshCw,
         Volume2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { DISEASE_COLORS, LANG_OPTIONS } from '../services/api'
import { useAuthStore } from '../store/auth'

const DISEASES = [
  { code: 'CA', icon: '🎗', name: 'Cancer Care',    color: '#A78BFA',
    agents: [
      { id: 'CA1', name: 'Screening', icon: '🔬', qs: ['When should I get a mammogram?','Do I need a BRCA test?','What is a colonoscopy?','HPV vs Pap smear?','My PSA is elevated?'] },
      { id: 'CA2', name: 'Treatment',  icon: '💊', qs: ['What is HER2-positive cancer?','Neoadjuvant vs adjuvant chemo?','FOLFOX side effects?','What is PD-L1 test?','Supplements during chemo?'] },
      { id: 'CA3', name: 'Supportive', icon: '🌿', qs: ['Managing chemo nausea?','What to eat during treatment?','Cancer fatigue tips?','What is palliative care?','Mouth sore management?'] },
      { id: 'CA4', name: 'Survivorship', icon: '🌟', qs: ['Follow-up scan schedule?','Long-term chemo effects?','Managing lymphedema?','What is chemo brain?','Returning to work?'] },
      { id: 'CA5', name: 'Genetics', icon: '🧬', qs: ['Should I get BRCA test?','Mother had ovarian cancer?','What is Lynch syndrome?','Options if BRCA1 positive?','Should my children be tested?'] },
    ]},
  { code: 'DM', icon: '🩺', name: 'Diabetes',       color: '#60A5FA',
    agents: [
      { id: 'DM1', name: 'Monitoring', icon: '📊', qs: ['Blood sugar 210 mg/dL?','What HbA1c target?','What is the 15-15 rule?','Time in Range meaning?','Dawn phenomenon vs Somogyi?'] },
      { id: 'DM2', name: 'Medication',  icon: '💉', qs: ['Metformin diarrhoea fix?','Semaglutide vs liraglutide?','SGLT-2 heart protection?','Basal-bolus insulin?','Metformin + SGLT-2 together?'] },
      { id: 'DM3', name: 'Nutrition',   icon: '🥗', qs: ['Foods to avoid with diabetes?','Can I eat rice?','Exercise to lower blood sugar?','What is glycaemic index?','Carbohydrate counting?'] },
      { id: 'DM4', name: 'Complications', icon: '⚠️', qs: ['Is this diabetic neuropathy?','eGFR declining?','Preventing diabetic foot?','Protein in urine?','Eye check frequency?'] },
      { id: 'DM5', name: 'Gestational', icon: '🤱', qs: ['GDM diagnosis?','Blood sugar targets in pregnancy?','Child type 1 diabetes?','Diabetes at 75?','GDM in future pregnancies?'] },
    ]},
  { code: 'CV', icon: '❤️', name: 'Cardiovascular', color: '#F472B6',
    agents: [
      { id: 'CV1', name: 'Clinical',   icon: '❤️', qs: ['BP 148/92 is hypertension?','LDL after heart attack?','SGLT-2 for non-diabetic HF?','HFrEF vs HFpEF?','AF anticoagulation?'] },
      { id: 'CV2', name: 'Emergency',  icon: '🚨', qs: ['Chest pain — what to do?','FAST stroke signs?','CPR instructions?','Hypertensive emergency?','D-dimer elevated?'] },
      { id: 'CV3', name: 'Medications',icon: '💊', qs: ['Lisinopril cough fix?','Beta-blocker in HF?','Sacubitril/valsartan?','Ibuprofen with heart meds?','Warfarin foods?'] },
      { id: 'CV4', name: 'Rehab',      icon: '🏃', qs: ['What is cardiac rehab?','Exercise heart rate target?','Post-bypass resistance training?','No rehab centre nearby?','Exercise helps HF?'] },
      { id: 'CV5', name: 'Nutrition',  icon: '🥗', qs: ['What is DASH diet?','Triglycerides 480 mg/dL?','Omega-3 fish oil heart?','Mediterranean diet in Brazil?','LATAM heart-healthy foods?'] },
    ]},
  { code: 'MH', icon: '🧠', name: 'Mental Health',  color: '#34D399',
    agents: [
      { id: 'MH1', name: 'Depression', icon: '🧠', qs: ['Depression vs sadness?','SSRIs vs SNRIs?','Antidepressant timeline?','Depression without meds?','PHQ-9 score of 15?'] },
      { id: 'MH2', name: 'Anxiety',    icon: '💚', qs: ['Do I have anxiety disorder?','Panic vs heart attack?','Breathing for anxiety?','Anxiety medications?','How CBT works?'] },
      { id: 'MH3', name: 'Sleep',      icon: '🌙', qs: ['Fix insomnia without pills?','What is CBT-I?','Does melatonin work?','Sleep and mental health?','Best sleep routine?'] },
      { id: 'MH4', name: 'Trauma',     icon: '🛡️', qs: ['PTSD symptoms?','How is PTSD treated?','What is EMDR?','Domestic violence help?','Handling flashbacks?'] },
      { id: 'MH5', name: 'Crisis',     icon: '🆘', qs: ['Thoughts of self-harm?','Help friend wanting to die?','Suicide warning signs?','Crisis support?','Safety planning?'] },
    ]},
  { code: 'RS', icon: '🫁', name: 'Respiratory',    color: '#F5C842',
    agents: [
      { id: 'RS1', name: 'Asthma',     icon: '🫁', qs: ['Using rescue inhaler?','Rescue vs preventer?','Asthma worse at night?','Asthma triggers?','Asthma ER signs?'] },
      { id: 'RS2', name: 'COPD',       icon: '🌬️', qs: ['COPD staging FEV1?','Best COPD inhaler?','Home oxygen therapy?','Prevent exacerbations?','Quit smoking with COPD?'] },
      { id: 'RS3', name: 'Therapy',    icon: '💨', qs: ['Breathing exercises COPD?','What is pulmonary rehab?','Improve breathing capacity?','Pursed-lip breathing?','Exercise for lungs?'] },
      { id: 'RS4', name: 'Medications',icon: '💊', qs: ['Using spacer correctly?','Inhaled steroid side effects?','Nebuliser vs inhaler?','What is montelukast?','Azithromycin for COPD?'] },
      { id: 'RS5', name: 'Sleep Apnea',icon: '🌙', qs: ['Do I have sleep apnea?','How does CPAP work?','Partner says I stop breathing?','Sleep apnea and heart?','CPAP alternatives?'] },
    ]},
]

function ConfidenceBadge({ score }) {
  const pct = Math.round(score * 100)
  const [color, label] = pct >= 70 ? ['#34D399','High'] : pct >= 50 ? ['#F5C842','Medium'] : ['#F05252','Low']
  return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border" style={{ color, borderColor: color + '40', background: color + '14' }}>{label} {pct}%</span>
}

function CitationBlock({ citations }) {
  if (!citations?.length) return null
  return (
    <div className="mt-3 pt-3 border-t border-line">
      <div className="text-[10px] font-mono text-ink3 uppercase tracking-wider mb-1.5">References</div>
      {citations.map((c, i) => (
        <div key={i} className="text-[11px] text-ink3 flex items-start gap-1.5 mb-0.5">
          <span className="text-gold font-mono">{i + 1}.</span>
          <span>{c.source}{c.year ? ` (${c.year})` : ''}{c.evidence_grade ? ` [Grade ${c.evidence_grade}]` : ''}</span>
        </div>
      ))}
    </div>
  )
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-ora flex items-center justify-center text-void text-xs font-bold font-disp mr-2 mt-0.5 flex-shrink-0">P</div>
      )}
      <div className={`max-w-[80%] ${isUser ? 'bg-bg4 rounded-2xl rounded-tr-sm' : 'bg-bg2 border border-line rounded-2xl rounded-tl-sm'} px-4 py-3`}>
        {isUser ? (
          <p className="text-ink text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            {msg.citations && <CitationBlock citations={msg.citations} />}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {msg.confidence != null && <ConfidenceBadge score={msg.confidence} />}
              {msg.escalated_to && msg.escalated_to !== 'none' && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purL border border-pur/20 text-pur">↑ {msg.escalated_to}</span>
              )}
            </div>
          </div>
        )}
        <div className="text-[10px] text-ink3 mt-1">{new Date(msg.created_at || Date.now()).toLocaleTimeString()}</div>
      </div>
    </div>
  )
}

export default function PatientApp() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [selectedDisease, setSelectedDisease] = useState(null)
  const [selectedAgent, setSelectedAgent]     = useState(null)
  const [messages, setMessages]               = useState([])
  const [input, setInput]                     = useState('')
  const [loading, setLoading]                 = useState(false)
  const [convId, setConvId]                   = useState(null)
  const [language, setLanguage]               = useState(user?.language || 'en')
  const [isRecording, setIsRecording]         = useState(false)
  const [uploadFile, setUploadFile]           = useState(null)
  const [showLangMenu, setShowLangMenu]       = useState(false)
  const endRef = useRef(null)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  // Auto-select first subscribed disease
  useEffect(() => {
    const subs = user?.subscribed_diseases || []
    if (subs.length > 0 && !selectedDisease) {
      const d = DISEASES.find(d => subs.includes(d.code))
      if (d) { setSelectedDisease(d); setSelectedAgent(d.agents[0]) }
    }
  }, [user])

  const onDrop = useCallback((files) => {
    if (files[0]) setUploadFile(files[0])
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, maxFiles: 1 })

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRef.current = new MediaRecorder(stream)
      chunksRef.current = []
      mediaRef.current.ondataavailable = (e) => chunksRef.current.push(e.data)
      mediaRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' })
        setUploadFile(new File([blob], 'audio.wav', { type: 'audio/wav' }))
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRef.current.start()
      setIsRecording(true)
    } catch { toast.error('Microphone access denied') }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    setIsRecording(false)
  }

  const sendMessage = async (text = input) => {
    if (!text.trim() && !uploadFile) return
    if (!selectedAgent) { toast.error('Please select an agent first'); return }

    const userMsg = { role: 'user', content: text || (uploadFile ? `[File: ${uploadFile.name}]` : ''), created_at: new Date().toISOString() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)

    try {
      let data
      if (uploadFile) {
        const fd = new FormData()
        fd.append('agent_id', selectedAgent.id)
        fd.append('language', language)
        fd.append('text_message', text)
        fd.append('file', uploadFile)
        if (convId) fd.append('conversation_id', convId)
        const res = await api.post('/chat/multimodal', fd)
        data = res.data
        setUploadFile(null)
      } else {
        const res = await api.post('/chat', { agent_id: selectedAgent.id, message: text, language, conversation_id: convId })
        data = res.data
      }
      if (!convId) setConvId(data.conversation_id)
      setMessages(m => [...m, {
        role: 'assistant', content: data.response,
        citations: data.citations, confidence: data.confidence,
        escalated_to: data.escalated_to, created_at: new Date().toISOString(),
      }])
    } catch (err) {
      toast.error('Failed to get response. Please try again.')
      setMessages(m => [...m, { role: 'assistant', content: 'I encountered an error. Please try again.', created_at: new Date().toISOString() }])
    } finally { setLoading(false) }
  }

  const selectDisease = (d) => {
    const subs = user?.subscribed_diseases || []
    if (!subs.includes(d.code) && user?.subscription !== 'enterprise') {
      toast.error('Subscribe to access this disease domain')
      navigate('/subscribe'); return
    }
    setSelectedDisease(d); setSelectedAgent(d.agents[0])
    setMessages([]); setConvId(null)
  }

  return (
    <div className="h-screen bg-void flex flex-col text-ink overflow-hidden">
      {/* Top bar */}
      <header className="h-12 bg-bg1 border-b border-line flex items-center justify-between px-4 flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-ora flex items-center justify-center font-disp font-bold text-void text-xs">P</div>
          <span className="font-disp font-bold text-sm">PRISM</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div className="relative">
            <button onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 bg-bg3 border border-line2 rounded-lg px-3 py-1.5 text-xs text-ink2 hover:text-ink transition-colors">
              <Globe size={12} />
              {LANG_OPTIONS.find(l => l.code === language)?.flag} {language.toUpperCase()}
            </button>
            {showLangMenu && (
              <div className="absolute right-0 top-full mt-1 bg-bg2 border border-line2 rounded-xl overflow-hidden shadow-xl z-50 w-36">
                {LANG_OPTIONS.map(l => (
                  <button key={l.code} onClick={() => { setLanguage(l.code); setShowLangMenu(false) }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-bg3 transition-colors flex items-center gap-2 ${language === l.code ? 'text-gold' : 'text-ink2'}`}>
                    {l.flag} {l.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => { logout(); navigate('/') }}
            className="flex items-center gap-1.5 text-ink3 hover:text-red text-xs px-2 py-1.5 rounded-lg hover:bg-bg3 transition-colors">
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Disease sidebar */}
        <aside className="w-52 bg-bg1 border-r border-line flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="p-3 border-b border-line">
            <div className="text-[10px] font-mono text-ink3 uppercase tracking-widest mb-2">Diseases</div>
            {DISEASES.map(d => {
              const subscribed = (user?.subscribed_diseases || []).includes(d.code) || user?.subscription === 'enterprise'
              return (
                <button key={d.code} onClick={() => selectDisease(d)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl mb-1 transition-all text-left
                    ${selectedDisease?.code === d.code ? 'border text-ink font-semibold' : 'text-ink3 hover:bg-bg3 hover:text-ink'}
                    ${!subscribed ? 'opacity-40' : ''}`}
                  style={selectedDisease?.code === d.code ? { background: d.color + '14', borderColor: d.color + '40' } : {}}>
                  <span className="text-base">{d.icon}</span>
                  <span className="text-xs">{d.name}</span>
                  {!subscribed && <span className="ml-auto text-[9px] font-mono text-ink3">🔒</span>}
                </button>
              )
            })}
          </div>

          {/* Agent list for selected disease */}
          {selectedDisease && (
            <div className="p-3">
              <div className="text-[10px] font-mono text-ink3 uppercase tracking-widest mb-2">Agents</div>
              {selectedDisease.agents.map(a => (
                <button key={a.id} onClick={() => { setSelectedAgent(a); setMessages([]); setConvId(null) }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl mb-1 text-left transition-all
                    ${selectedAgent?.id === a.id ? 'border text-ink' : 'text-ink3 hover:bg-bg3 hover:text-ink'}`}
                  style={selectedAgent?.id === a.id ? { background: selectedDisease.color + '14', borderColor: selectedDisease.color + '40' } : {}}>
                  <span className="text-sm">{a.icon}</span>
                  <div>
                    <div className="text-xs font-semibold">{a.name}</div>
                    <div className="text-[10px] font-mono text-ink3">{a.id}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Chat area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {!selectedDisease ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="text-5xl mb-4">🏥</div>
              <h2 className="font-disp font-bold text-2xl mb-2">Welcome to PRISM</h2>
              <p className="text-ink3 text-sm max-w-md">Select a disease domain from the sidebar to start chatting with your AI health agent.</p>
              {!(user?.subscribed_diseases?.length) && (
                <Link to="/subscribe" className="btn-primary mt-6 text-sm">Subscribe to a Disease Domain</Link>
              )}
            </div>
          ) : (
            <>
              {/* Agent header */}
              <div className="px-5 py-3 border-b border-line bg-bg1 flex items-center gap-3 flex-shrink-0" style={{ borderLeftWidth: 3, borderLeftColor: selectedDisease.color }}>
                <span className="text-xl">{selectedAgent?.icon}</span>
                <div>
                  <div className="font-semibold text-sm">{selectedAgent?.name}</div>
                  <div className="text-[10px] font-mono text-ink3">{selectedAgent?.id} · {selectedDisease.name}</div>
                </div>
                <button onClick={() => { setMessages([]); setConvId(null) }}
                  className="ml-auto text-ink3 hover:text-ink p-1.5 rounded-lg hover:bg-bg3 transition-colors">
                  <RefreshCw size={13} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5">
                {messages.length === 0 && selectedAgent && (
                  <div className="mb-6">
                    <div className="text-xs text-ink3 mb-3 font-mono">Suggested questions for {selectedAgent.name}:</div>
                    <div className="grid gap-2">
                      {selectedAgent.qs.map((q, i) => (
                        <button key={i} onClick={() => sendMessage(q)}
                          className="text-left bg-bg2 border border-line hover:border-line2 rounded-xl px-4 py-2.5 text-sm text-ink2 hover:text-ink transition-all flex items-center gap-2 group">
                          <span className="text-xs font-mono text-ink3 group-hover:text-gold transition-colors">{i + 1}</span>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
                {loading && (
                  <div className="flex items-start gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-ora flex items-center justify-center text-void text-xs font-bold font-disp flex-shrink-0">P</div>
                    <div className="bg-bg2 border border-line rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-gold" />
                      <span className="text-xs text-ink3 font-mono">Analysing with evidence…</span>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Upload preview */}
              {uploadFile && (
                <div className="mx-5 mb-2 flex items-center gap-2 bg-bg3 border border-line2 rounded-xl px-3 py-2">
                  <Paperclip size={13} className="text-gold flex-shrink-0" />
                  <span className="text-xs text-ink2 flex-1 truncate">{uploadFile.name}</span>
                  <button onClick={() => setUploadFile(null)} className="text-ink3 hover:text-red text-xs">✕</button>
                </div>
              )}

              {/* Input */}
              <div className="px-5 pb-5 pt-2 flex-shrink-0 border-t border-line bg-bg1">
                <div {...getRootProps()} className={`mb-2 ${isDragActive ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'} transition-all border-2 border-dashed border-gold/40 rounded-xl p-3 text-center text-xs text-ink3`}>
                  <input {...getInputProps()} />
                  Drop prescription / lab report / audio here
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      className="input w-full resize-none pr-10 min-h-[44px] max-h-32"
                      rows={1}
                      placeholder={`Ask ${selectedAgent?.name || 'your health agent'}…`}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    />
                  </div>
                  <label className="btn-ghost flex items-center justify-center w-10 cursor-pointer flex-shrink-0">
                    <input {...getInputProps()} className="hidden" />
                    <Paperclip size={15} />
                  </label>
                  <button onClick={isRecording ? stopRecording : startRecording}
                    className={`btn-ghost w-10 flex items-center justify-center flex-shrink-0 ${isRecording ? 'text-red border-red/30' : ''}`}>
                    {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
                  </button>
                  <button onClick={() => sendMessage()} disabled={loading || (!input.trim() && !uploadFile)}
                    className="btn-primary w-10 flex items-center justify-center flex-shrink-0 disabled:opacity-40">
                    <Send size={15} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <AlertCircle size={10} className="text-ink3 flex-shrink-0" />
                  <span className="text-[10px] text-ink3">Not a substitute for professional medical advice. Always consult your doctor.</span>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
