import { Box } from '@mui/material';
import MaterialDecorBackground from './MaterialDecorBackground';
import PortalMaterialHeader from './PortalMaterialHeader';
import { GRADIENT_PAGE, GRADIENT_PAGE_ADMIN } from '../../themes/material/constants';

export default function PortalMaterialShell({
  children,
  portalLabel = 'Patient Portal',
  fallbackPath = '/',
  centered = false,
  showBack = true,
  gradient = false,
  gradientTone = 'patient',
  fullHeight = false,
  avatarLetter = 'P',
  showLogout = true,
  headerRight,
}) {
  const pageBackground =
    gradient && gradientTone === 'admin' ? GRADIENT_PAGE_ADMIN : GRADIENT_PAGE;

  const decorVariant = !gradient
    ? 'shell'
    : centered
      ? gradientTone === 'admin'
        ? 'login-admin'
        : 'login-patient'
      : 'home';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        height: fullHeight || gradient ? '100vh' : 'auto',
        width: '100%',
        maxWidth: '100vw',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: gradient ? 'transparent' : 'background.default',
        background: gradient ? pageBackground : undefined,
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <MaterialDecorBackground variant={decorVariant} />

      <PortalMaterialHeader
        portalLabel={portalLabel}
        fallbackPath={fallbackPath}
        showBack={showBack}
        gradient={gradient}
        avatarLetter={avatarLetter}
        showLogout={showLogout}
        headerRight={headerRight}
      />

      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          overflowY: centered ? 'hidden' : 'auto',
          overflowX: 'hidden',
          ...(centered
            ? { display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, py: { xs: 3, sm: 5 } }
            : gradient
              ? { display: 'flex', flexDirection: 'column' }
              : fullHeight
                ? { display: 'flex', flexDirection: 'column', overflow: 'hidden' }
                : { px: { xs: 2, sm: 3 }, py: { xs: 3, sm: 4 } }),
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
