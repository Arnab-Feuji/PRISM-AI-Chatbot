import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const LANGS = [
  { code: 'en', label: 'English 🇺🇸' }, { code: 'hi', label: 'हिंदी 🇮🇳' },
  { code: 'te', label: 'తెలుగు 🇮🇳' }, { code: 'es', label: 'Español 🇲🇽' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ 🇮🇳' },
]

export default function Login() {
  const [params]  = useSearchParams()
  const navigate   = useNavigate()
  const { login, register } = useAuthStore()
  const [mode, setMode]     = useState(params.get('register') ? 'register' : 'login')
  const [show, setShow]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm]     = useState({ email: '', password: '', name: '', language: 'en' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const user = await login(form.email, form.password)
        toast.success(`Welcome back, ${user.name}!`)
        navigate(user.role === 'admin' ? '/admin' : '/app')
      } else {
        const user = await register(form.email, form.name, form.password, form.language)
        toast.success(`Welcome to PRISM, ${user.name}!`)
        navigate('/subscribe')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold to-ora mx-auto flex items-center justify-center font-disp font-bold text-2xl text-void shadow-lg shadow-gold/30 mb-4">P</div>
          <h1 className="font-disp font-bold text-2xl">PRISM</h1>
          <p className="text-ink3 text-sm mt-1">Patient-centric Health Intelligence</p>
        </div>

        <div className="card p-8">
          {/* Mode tabs */}
          <div className="flex gap-1 bg-bg3 rounded-xl p-1 mb-6">
            {['login','register'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${mode === m ? 'bg-bg4 text-ink shadow' : 'text-ink3 hover:text-ink'}`}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="text-xs text-ink3 font-mono font-semibold uppercase tracking-wider mb-1 block">Full Name</label>
                <input className="input w-full" placeholder="Dr. Maria González" value={form.name}
                  onChange={e => set('name', e.target.value)} required />
              </div>
            )}
            <div>
              <label className="text-xs text-ink3 font-mono font-semibold uppercase tracking-wider mb-1 block">Email</label>
              <input className="input w-full" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs text-ink3 font-mono font-semibold uppercase tracking-wider mb-1 block">Password</label>
              <div className="relative">
                <input className="input w-full pr-10" type={show ? 'text' : 'password'}
                  placeholder="••••••••" value={form.password}
                  onChange={e => set('password', e.target.value)} required minLength={6} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink"
                  onClick={() => setShow(!show)}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {mode === 'register' && (
              <div>
                <label className="text-xs text-ink3 font-mono font-semibold uppercase tracking-wider mb-1 block">Preferred Language</label>
                <select className="input w-full" value={form.language} onChange={e => set('language', e.target.value)}>
                  {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
            )}

            {/* Demo accounts */}
            <div className="text-xs text-ink3 bg-bg3 rounded-lg p-3 border border-line">
              <div className="font-mono font-semibold mb-1 text-ink2">Demo accounts:</div>
              <div>Patient: patient@prism.ai / demo123</div>
              <div>Admin: admin@prism.ai / admin123</div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm">
              {loading ? 'Processing…' : mode === 'login' ? 'Sign In to PRISM' : 'Create Account'}
            </button>
          </form>
        </div>

        <Link to="/" className="flex items-center gap-1.5 justify-center mt-4 text-ink3 text-xs hover:text-ink transition-colors">
          <ArrowLeft size={13} /> Back to home
        </Link>
      </div>
    </div>
  )
}
