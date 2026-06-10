import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import { useAuthStore } from './store/auth'
import { useThemeStore, THEMES } from './store/theme'
import { LanguageProvider } from './Context/LanguageContext'
import { ThemedPatientPage } from './pages/patient/ThemedPatientPage'

// Components
import PortalLayout from './Components/PortalLayout'

// Lazy load pages
const Home                = React.lazy(() => import('./pages/Home'))
const HomeMui             = React.lazy(() => import('./pages/patient/material/HomeMui'))
const Login               = React.lazy(() => import('./pages/Login'))
const PatientLanding      = React.lazy(() => import('./pages/PatientLanding'))
const PatientLandingMui   = React.lazy(() => import('./pages/patient/material/PatientLandingMui'))
const PatientApp          = React.lazy(() => import('./pages/PatientApp_voice_integration'))
const PatientAppMui       = React.lazy(() => import('./pages/patient/material/PatientAppMui'))
const AdminPortal         = React.lazy(() => import('./pages/AdminPortal'))
const AdminPortalMui      = React.lazy(() => import('./pages/admin/material/AdminPortalMui'))
const AdminIntro          = React.lazy(() => import('./pages/AdminIntro'))
const AdminIntroMui       = React.lazy(() => import('./pages/admin/material/AdminIntroMui'))
const PatientDashboard    = React.lazy(() => import('./pages/PatientDashboard'))
const PatientDashboardMui = React.lazy(() => import('./pages/patient/material/PatientDashboardMui'))

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, token } = useAuthStore()
  const location = window.location;

  if (!token || !user) {
    const roleParam = adminOnly ? '?role=admin' : '?role=patient';
    return <Navigate to={`/login${roleParam}`} state={{ from: location.pathname }} replace />
  }
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/login?role=admin" state={{ from: location.pathname }} replace />
  }
  return children
}

function App() {
  const { hydrate } = useAuthStore()
  const { currentTheme } = useThemeStore()

  React.useEffect(() => { hydrate() }, [])

  React.useEffect(() => {
    const themeClasses = ['theme-black-pink', 'theme-titanium-gold', 'theme-neural-glass', 'theme-material-patient'];
    document.documentElement.classList.remove(...themeClasses);
    document.body.classList.remove(...themeClasses);

    if (currentTheme !== THEMES.MATERIAL_PATIENT) {
      document.documentElement.classList.add(`theme-${currentTheme}`);
      document.body.classList.add(`theme-${currentTheme}`);
    }
  }, [currentTheme]);

  const isMaterialTheme = currentTheme === THEMES.MATERIAL_PATIENT;

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-500">
      <BrowserRouter>
      <PortalLayout>
        <React.Suspense fallback={<div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center"><div className="text-[var(--accent)] font-bold text-xl animate-pulse">PRISM Loading…</div></div>}>
          <Routes>
            <Route path="/" element={<ThemedPatientPage default={Home} material={HomeMui} />} />
            <Route path="/login" element={<Login />} />

            {/* Patient Flow */}
            <Route
              path="/patient"
              element={<ThemedPatientPage default={PatientLanding} material={PatientLandingMui} />}
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <ThemedPatientPage default={PatientDashboard} material={PatientDashboardMui} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/*"
              element={
                <ProtectedRoute>
                  <ThemedPatientPage default={PatientApp} material={PatientAppMui} />
                </ProtectedRoute>
              }
            />

            {/* Admin Flow */}
            <Route
              path="/admin-intro"
              element={
                <ProtectedRoute adminOnly>
                  <ThemedPatientPage default={AdminIntro} material={AdminIntroMui} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute adminOnly>
                  <ThemedPatientPage default={AdminPortal} material={AdminPortalMui} />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </PortalLayout>
      <Toaster
        position="top-right"
        toastOptions={{
          style: isMaterialTheme
            ? {
                background: '#FFFFFF',
                color: '#1A2332',
                border: '1px solid rgba(26,35,50,0.08)',
                boxShadow: '0 8px 24px rgba(16,24,40,.10)',
              }
            : {
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1px solid var(--border)',
              },
        }}
      />
      </BrowserRouter>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
)
