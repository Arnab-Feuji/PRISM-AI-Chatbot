import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuthStore } from '../store/auth'

const TIERS = [
  { id: 'free',       name: 'Free',       price: 0,   diseases: 1, messages: 5,   multimodal: false, color: '#8E96B8' },
  { id: 'basic',      name: 'Basic',      price: 9,   diseases: 3, messages: 50,  multimodal: false, color: '#60A5FA' },
  { id: 'premium',    name: 'Premium',    price: 29,  diseases: 5, messages: 200, multimodal: true,  color: '#F5C842', popular: true },
  { id: 'enterprise', name: 'Enterprise', price: 99,  diseases: 5, messages: -1,  multimodal: true,  color: '#A78BFA' },
]

const DISEASES = [
  { code: 'CA', icon: '🎗', name: 'Cancer Care' },
  { code: 'DM', icon: '🩺', name: 'Diabetes' },
  { code: 'CV', icon: '❤️', name: 'Cardiovascular' },
  { code: 'MH', icon: '🧠', name: 'Mental Health' },
  { code: 'RS', icon: '🫁', name: 'Respiratory' },
]

export default function Subscribe() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const [tier, setTier]         = useState('free')
  const [selected, setSelected] = useState([])
  const [loading, setLoading]   = useState(false)

  const maxD = TIERS.find(t => t.id === tier)?.diseases || 1

  const toggleDisease = (code) => {
    setSelected(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : prev.length < maxD ? [...prev, code] : prev
    )
  }

  const submit = async () => {
    if (!selected.length) { toast.error('Select at least one disease domain'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/subscribe', { tier, disease_codes: selected })
      updateUser({ subscription: data.subscription, subscribed_diseases: data.subscribed_diseases })
      toast.success('Subscription activated!')
      navigate('/app')
    } catch { toast.error('Subscription failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-void text-ink px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-ora mx-auto flex items-center justify-center font-disp font-bold text-xl text-void mb-4">P</div>
          <h1 className="font-disp font-bold text-3xl mb-2">Choose Your Plan</h1>
          <p className="text-ink3 text-sm">Subscribe to disease domains and unlock AI health agents</p>
        </div>

        {/* Tier cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-10">
          {TIERS.map(t => (
            <button key={t.id} onClick={() => { setTier(t.id); setSelected([]) }}
              className={`card p-5 text-left transition-all relative ${tier === t.id ? 'border-2' : 'hover:border-line2'}`}
              style={tier === t.id ? { borderColor: t.color } : {}}>
              {t.popular && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gold text-void text-[10px] font-bold font-mono px-2 py-0.5 rounded-full">POPULAR</div>}
              <div className="font-disp font-bold text-base mb-1" style={{ color: t.color }}>{t.name}</div>
              <div className="text-2xl font-bold mb-3">${t.price}<span className="text-sm text-ink3 font-normal">/mo</span></div>
              <div className="space-y-1.5 text-xs text-ink3">
                <div className="flex items-center gap-1.5"><CheckCircle size={11} style={{ color: t.color }} />{t.diseases} disease{t.diseases > 1 ? 's' : ''}</div>
                <div className="flex items-center gap-1.5"><CheckCircle size={11} style={{ color: t.color }} />{t.messages === -1 ? 'Unlimited' : t.messages} msgs/day</div>
                <div className="flex items-center gap-1.5">{t.multimodal ? <CheckCircle size={11} style={{ color: t.color }} /> : <Lock size={11} className="text-ink3" />}Multimodal</div>
              </div>
            </button>
          ))}
        </div>

        {/* Disease selector */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-disp font-bold text-base">Select Disease Domains</h3>
            <span className="text-xs font-mono text-ink3">{selected.length}/{maxD} selected</span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {DISEASES.map(d => {
              const sel = selected.includes(d.code)
              const disabled = !sel && selected.length >= maxD
              return (
                <button key={d.code} onClick={() => !disabled && toggleDisease(d.code)}
                  className={`p-4 rounded-xl border text-center transition-all ${sel ? 'border-gold bg-goldL' : disabled ? 'opacity-30 cursor-not-allowed border-line' : 'border-line hover:border-line2'}`}>
                  <div className="text-2xl mb-1">{d.icon}</div>
                  <div className="text-xs font-medium">{d.name}</div>
                  {sel && <CheckCircle size={14} className="text-gold mx-auto mt-1" />}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={() => navigate('/app')} className="btn-ghost">Skip for now</button>
          <button onClick={submit} disabled={loading || !selected.length} className="btn-primary px-8">
            {loading ? 'Activating…' : 'Activate Subscription'}
          </button>
        </div>
      </div>
    </div>
  )
}
