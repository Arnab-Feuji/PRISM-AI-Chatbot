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

  const useViewportLock = isSimulated || isApp || isAdmin;

  return (
    <div className={`${useViewportLock ? 'h-screen overflow-hidden' : 'min-h-screen'} transition-all duration-500 bg-[var(--bg-main)] text-[var(--text-main)] ${isPatientRoute ? 'pw' : ''} flex flex-col items-center ${useViewportLock ? '' : 'justify-center'}`}>

      {/* Device Simulation Wrapper */}
      <div 
        className={`transition-all duration-500 relative flex flex-col bg-[var(--bg-main)]
          ${isSimulated ? 'shadow-[0_0_100px_rgba(0,0,0,0.5)] border-[8px] border-[#1a1c24] my-8 rounded-[3rem] overflow-hidden' : 'w-full h-full min-h-0'}`}
        style={{ 
          width: currentWidth,
          height: isSimulated ? 'calc(100vh - 64px)' : useViewportLock ? '100%' : 'auto',
          minHeight: useViewportLock ? '0' : '100vh',
          transform: isSimulated ? 'translate3d(0,0,0)' : 'none' // Containing block for fixed elements
        }}
      >
        {!isLanding && <UnifiedNav />}
        
        <main className={`flex-1 min-h-0 transition-all duration-500 ${isApp || isAdmin ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'} ${!isLanding ? 'pt-16' : ''}`}>
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
