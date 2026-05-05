import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import { useAuthStore } from './store/auth'

// Lazy load pages
const Landing       = React.lazy(() => import('./pages/Landing'))
const Login         = React.lazy(() => import('./pages/Login'))
const PatientApp    = React.lazy(() => import('./pages/PatientApp'))
const AdminPortal   = React.lazy(() => import('./pages/AdminPortal'))
const Subscribe     = React.lazy(() => import('./pages/Subscribe'))

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, token } = useAuthStore()
  if (!token || !user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/app" replace />
  return children
}

function App() {
  const { hydrate } = useAuthStore()
  React.useEffect(() => { hydrate() }, [])

  return (
    <BrowserRouter>
      <React.Suspense fallback={<div className="min-h-screen bg-void flex items-center justify-center"><div className="text-gold font-disp text-xl animate-pulse">PRISM Loading…</div></div>}>
        <Routes>
          <Route path="/"        element={<Landing />} />
          <Route path="/login"   element={<Login />} />
          <Route path="/subscribe" element={<ProtectedRoute><Subscribe /></ProtectedRoute>} />
          <Route path="/app/*"   element={<ProtectedRoute><PatientApp /></ProtectedRoute>} />
          <Route path="/admin/*" element={<ProtectedRoute adminOnly><AdminPortal /></ProtectedRoute>} />
          <Route path="*"        element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
      <Toaster position="top-right" toastOptions={{ style: { background: '#111526', color: '#DDE3F5', border: '1px solid #2A3055' } }} />
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
