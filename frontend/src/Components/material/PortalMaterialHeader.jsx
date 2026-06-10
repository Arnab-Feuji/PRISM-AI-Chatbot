import {
  AppBar,
  Toolbar,
  Box,
  alpha,
  IconButton,
  Stack,
  Typography,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import PortalBrandLockup from './PortalBrandLockup';

/**
 * Material counterpart to PortalClassicHeader — same DOM structure:
 * [ sticky bar > row justify-between > [ back + brand lockup ] | optional actions ] ]
 */
export default function PortalMaterialHeader({
  portalLabel,
  fallbackPath = '/',
  showBack = true,
  gradient = false,
  avatarLetter = 'P',
  showLogout = true,
  headerRight,
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallbackPath);
  };

  const handleLogout = () => {
    const isAdmin = user?.role === 'admin';
    logout();
    navigate(isAdmin ? '/login?role=admin' : '/login?role=patient');
  };

  const showLogoutAction = showLogout && Boolean(user);
  const hasRight = showLogoutAction || headerRight;

  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="inherit"
      sx={{
        flexShrink: 0,
        width: '100%',
        bgcolor: gradient ? alpha('#FFFFFF', 0.88) : 'background.paper',
        backdropFilter: gradient ? 'blur(12px)' : undefined,
        borderBottom: 1,
        borderColor: gradient ? alpha('#1565C0', 0.1) : 'divider',
        boxShadow: gradient ? `0 4px 24px ${alpha('#1565C0', 0.06)}` : undefined,
        zIndex: 10,
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          minHeight: { xs: 56, sm: 64 },
          px: { xs: 2, sm: 3 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 2 }}>
          {showBack && (
            <Box
              component="button"
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              sx={{
                display: 'flex',
                flexShrink: 0,
                alignItems: 'center',
                justifyContent: 'center',
                p: 1,
                ml: -1,
                border: 0,
                bgcolor: 'transparent',
                cursor: 'pointer',
                color: 'text.primary',
                transition: 'opacity 0.2s',
                '&:hover': { opacity: 0.7 },
              }}
            >
              <ArrowBackIcon sx={{ fontSize: 22 }} />
            </Box>
          )}

          <PortalBrandLockup portalLabel={portalLabel} variant="portal" avatarLetter={avatarLetter} />
        </Box>

        {hasRight ? (
          <Box sx={{ display: 'flex', flexShrink: 0, alignItems: 'center', gap: 1.5 }}>
            {showLogoutAction && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box textAlign="right" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: 160 }}>
                    {user.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.role === 'admin' ? 'Admin' : 'Patient'}
                  </Typography>
                </Box>
                <Tooltip title="Sign out">
                  <IconButton onClick={handleLogout} aria-label="Sign out">
                    <LogoutIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            )}
            {headerRight}
          </Box>
        ) : null}
      </Toolbar>
    </AppBar>
  );
}
