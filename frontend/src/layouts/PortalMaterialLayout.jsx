import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  IconButton,
  Stack,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import PortalBrandLockup from '../Components/material/PortalBrandLockup';

export default function PortalMaterialLayout({
  variant = 'patient',
  children,
  maxWidth = 'lg',
  showNav = true,
  fullscreen = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const isPatient = variant === 'patient';

  const isLanding = isPatient && location.pathname === '/patient';
  const isApp = isPatient && location.pathname.startsWith('/app');
  const hideNav = isPatient ? !showNav || isLanding || isApp : !showNav || fullscreen;

  const handleLogout = () => {
    logout();
    navigate(isPatient ? '/login?role=patient' : '/login?role=admin');
  };

  const homePath = isPatient ? (user ? '/dashboard' : '/patient') : '/admin-intro';
  const portalLabel = isPatient ? 'Patient Portal' : 'Operations Console';
  const roleLabel = isPatient ? 'Patient' : 'Admin';
  const userFallback = isPatient ? 'Guest' : 'Administrator';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        height: fullscreen ? '100vh' : 'auto',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        overflow: fullscreen ? 'hidden' : 'visible',
      }}
    >
      {!hideNav && (
        <AppBar position="sticky" color="inherit">
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ cursor: 'pointer' }} onClick={() => navigate(homePath)}>
              <PortalBrandLockup
                portalLabel={portalLabel}
                avatarLetter={isPatient ? 'P' : 'A'}
              />
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <Box textAlign="right" sx={{ display: { xs: isPatient ? 'block' : 'none', sm: 'block' } }}>
                <Typography variant="body2" fontWeight={700}>
                  {user?.name || userFallback}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {roleLabel}
                </Typography>
              </Box>
              <IconButton onClick={handleLogout} aria-label="Sign out">
                <LogoutIcon />
              </IconButton>
            </Stack>
          </Toolbar>
        </AppBar>
      )}

      {fullscreen ? (
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>{children}</Box>
      ) : (
        <Container
          maxWidth={maxWidth}
          sx={{ py: isPatient && isLanding ? 0 : isPatient ? 4 : 3, flex: 1 }}
          disableGutters={isLanding}
        >
          {children}
        </Container>
      )}
    </Box>
  );
}
