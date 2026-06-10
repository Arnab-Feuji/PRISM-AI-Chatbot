import React from 'react';
import { useLocation } from 'react-router-dom';
import UnifiedNav from './UnifiedNav';
import { useDeviceStore } from '../store/device';
import { useThemeStore } from '../store/theme';
import { isMaterialRoute, isAdminRoute } from '../utils/materialRoutes';
import { Box, alpha } from '@mui/material';
import MaterialThemeProvider from '../themes/material/MaterialThemeProvider';
import PortalMaterialLayout from '../layouts/PortalMaterialLayout';
import DeviceSimulationBar from './DeviceSimulationBar';
import { DEVICE_WIDTHS } from '../themes/material/constants';

export default function PortalLayout({ children }) {
  const location = useLocation();
  const { currentDevice } = useDeviceStore();
  const { isMaterialPatient } = useThemeStore();

  const isHomePage = location.pathname === '/';
  const isAdmin = isAdminRoute(location.pathname, location.search);
  const isAdminPortal = location.pathname.startsWith('/admin') && location.pathname !== '/admin-intro';
  const useMuiTheme = isMaterialPatient() && isMaterialRoute(location.pathname, location.search);

  const isPatientRouteLegacy =
    location.pathname.startsWith('/app') ||
    location.pathname.startsWith('/plans') ||
    location.pathname.startsWith('/checkout') ||
    location.pathname.startsWith('/patient') ||
    location.pathname.startsWith('/dashboard');

  const isHome = isHomePage;
  const isApp = location.pathname.startsWith('/app');
  const isSimulationEnabled = isHome && !useMuiTheme;
  const isLanding = isHome || location.pathname === '/patient';
  const isAdminIntro = location.pathname === '/admin-intro';

  const deviceWidths = DEVICE_WIDTHS;

  const currentWidth = isSimulationEnabled ? deviceWidths[currentDevice] : '100%';
  const isSimulated = isSimulationEnabled && currentDevice !== 'desktop';

  if (useMuiTheme) {
    const isLogin = location.pathname === '/login';

    const isPatientLanding = location.pathname === '/patient';

    if (isLogin || isPatientLanding) {
      return (
        <MaterialThemeProvider forceAdmin={isAdmin && isLogin}>
          <Box sx={{ width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
            {children}
          </Box>
        </MaterialThemeProvider>
      );
    }

    if (isHomePage) {
      const simWidth = deviceWidths[currentDevice];
      const homeSimulated = currentDevice !== 'desktop';
      return (
        <MaterialThemeProvider>
          <Box
            sx={{
              minHeight: '100vh',
              width: '100%',
              maxWidth: '100vw',
              display: 'flex',
              flexDirection: 'column',
              alignItems: homeSimulated ? 'center' : 'stretch',
              justifyContent: homeSimulated ? 'center' : 'flex-start',
              bgcolor: homeSimulated ? '#E8EDF4' : 'background.default',
              py: homeSimulated ? 3 : 0,
              px: homeSimulated ? 2 : 0,
              overflowX: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            {homeSimulated && <DeviceSimulationBar className="mb-3 shrink-0" />}
            <Box
              sx={{
                width: homeSimulated ? simWidth : '100%',
                maxWidth: '100%',
                minWidth: 0,
                minHeight: homeSimulated ? 'calc(100vh - 120px)' : '100vh',
                height: homeSimulated ? 'calc(100vh - 120px)' : '100vh',
                maxHeight: homeSimulated ? 'calc(100vh - 120px)' : '100vh',
                borderRadius: homeSimulated ? 6 : 0,
                overflowY: homeSimulated ? 'auto' : 'hidden',
                overflowX: 'hidden',
                border: homeSimulated ? '8px solid #1a2332' : 'none',
                boxShadow: homeSimulated ? '0 0 80px rgba(0,0,0,0.25)' : 'none',
                bgcolor: 'background.default',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {children}
              {homeSimulated && currentDevice === 'mobile' && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 128,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: alpha('#1A2332', 0.2),
                  }}
                />
              )}
            </Box>
          </Box>
        </MaterialThemeProvider>
      );
    }

    if (isAdminPortal || isAdminIntro) {
      return (
        <MaterialThemeProvider forceAdmin>
          <Box sx={{ width: '100%', maxWidth: '100vw', overflowX: 'hidden', height: '100vh', minHeight: '100vh' }}>
            {children}
          </Box>
        </MaterialThemeProvider>
      );
    }

    return (
      <MaterialThemeProvider>
        <PortalMaterialLayout variant="patient" fullscreen={isApp}>{children}</PortalMaterialLayout>
      </MaterialThemeProvider>
    );
  }

  return (
    <div
      className={`min-h-screen w-full max-w-[100vw] overflow-x-hidden transition-all duration-500 bg-[var(--bg-main)] text-[var(--text-main)] ${isPatientRouteLegacy ? 'pw' : ''} flex flex-col ${isHome && !isSimulated ? 'items-stretch' : 'items-center justify-center'}`}
    >
      {isSimulated && isHome && (
        <DeviceSimulationBar className="mb-4 mt-4 shrink-0" />
      )}
      <div
        className={`transition-all duration-500 relative flex flex-col bg-[var(--bg-main)]
          ${isSimulated ? 'shadow-[0_0_100px_rgba(0,0,0,0.5)] border-[8px] border-[#1a1c24] my-4 rounded-[3rem] overflow-y-auto overflow-x-hidden' : 'w-full'}`}
        style={{
          width: currentWidth,
          height: isSimulated || isApp ? (isSimulated ? 'calc(100vh - 120px)' : '100vh') : 'auto',
          minHeight: isSimulated || isApp ? '0' : '100vh',
          transform: isSimulated ? 'translate3d(0,0,0)' : 'none',
        }}
      >
        {!isLanding && !isAdminPortal && !isAdminIntro && <UnifiedNav />}

        <main
          className={`flex-1 transition-all duration-500 ${isApp ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'} ${!isLanding && !isAdminPortal && !isAdminIntro ? 'pt-16' : ''} ${isAdminIntro ? 'min-h-0' : ''}`}
        >
          {children}
        </main>

        {isSimulated && currentDevice === 'mobile' && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/20 rounded-full z-[110]" />
        )}
      </div>

      {isSimulated && (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--accent)]/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
        </div>
      )}
    </div>
  );
}
