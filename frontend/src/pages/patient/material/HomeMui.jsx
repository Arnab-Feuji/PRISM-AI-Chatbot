import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  alpha,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShieldIcon from '@mui/icons-material/Shield';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/auth';
import PortalBrandLockup from '../../../Components/material/PortalBrandLockup';
import MaterialDecorBackground from '../../../Components/material/MaterialDecorBackground';
import HomePortalCard from '../../../Components/material/HomePortalCard';
import HomeFooterMui from '../../../Components/material/HomeFooterMui';
import { GRADIENT_BRAND, GRADIENT_PAGE } from '../../../themes/material/constants';

const STATS = [
  { value: '5', label: 'Disease Domains' },
  { value: '30', label: 'Active Agents' },
  { value: '5', label: 'Global Languages' },
  { value: '19-Dim', label: 'Quality Gates' },
];

const PORTALS = [
  {
    id: 'patient',
    label: 'Patient Portal',
    title: 'Your Health Companion',
    description:
      'Access specialist AI care companions for diabetes, cardiovascular, cancer and more. Get evidence-based answers in your language, 24/7.',
    cta: 'Enter Patient Portal',
    icon: FavoriteIcon,
    path: '/patient',
    color: '#1565C0',
  },
  {
    id: 'admin',
    label: 'Admin Console',
    title: 'Operational Health',
    description:
      'Command centre for RAG performance, clinical audit trails, agent registry and smart routing thresholds.',
    cta: 'Enter Admin Portal',
    icon: ShieldIcon,
    path: '/login?role=admin',
    color: '#00897B',
  },
];

const gradientTextSx = {
  background: GRADIENT_BRAND,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const pageShellSx = {
  height: '100%',
  minHeight: '100%',
  maxHeight: '100%',
  width: '100%',
  maxWidth: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: GRADIENT_PAGE,
  position: 'relative',
  overflow: 'hidden',
  boxSizing: 'border-box',
};

export default function HomeMui() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <Box sx={pageShellSx}>
      <MaterialDecorBackground variant="home" />

      <AppBar
        position="static"
        color="inherit"
        elevation={0}
        sx={{
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
          bgcolor: alpha('#FFFFFF', 0.88),
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${alpha('#1565C0', 0.1)}`,
          boxShadow: `0 4px 24px ${alpha('#1565C0', 0.06)}`,
        }}
      >
        <Toolbar disableGutters sx={{ width: '100%', px: { xs: 2, sm: 3 }, minHeight: { xs: 56, sm: 64 }, display: 'flex', alignItems: 'center' }}>
          <PortalBrandLockup gradientAvatar />
          <Box sx={{ flexGrow: 1 }} />
          {!user ? (
            <Button
              variant="outlined"
              onClick={() => navigate('/login')}
              sx={{
                flexShrink: 0,
                border: '2px solid transparent',
                background: `linear-gradient(#fff, #fff) padding-box, ${GRADIENT_BRAND} border-box`,
                fontWeight: 700,
                '&:hover': { background: GRADIENT_BRAND, color: '#fff' },
              }}
            >
              Sign In
            </Button>
          ) : (
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexShrink: 0 }}>
              <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right', lineHeight: 1.25 }}>
                <Typography variant="caption" color="text.secondary" display="block">Welcome back</Typography>
                <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: 200 }}>{user.name}</Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate(user.role === 'admin' ? '/admin-intro' : '/app')}
                sx={{
                  whiteSpace: 'nowrap',
                  px: { xs: 2, sm: 2.5 },
                  background: GRADIENT_BRAND,
                  '&:hover': { background: 'linear-gradient(135deg, #0D47A1 0%, #00695C 55%, #1976D2 100%)' },
                }}
              >
                Dashboard
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 0.5, md: 1 },
          position: 'relative',
          zIndex: 1,
          width: '100%',
          minWidth: 0,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <Chip
          label="AI-Powered Healthcare Platform · Latin America"
          size="small"
          sx={{
            mb: 1,
            fontWeight: 700,
            letterSpacing: 1,
            color: '#fff',
            background: GRADIENT_BRAND,
            border: 'none',
            boxShadow: `0 4px 16px ${alpha('#1565C0', 0.28)}`,
          }}
        />

        <Typography variant="h3" fontWeight={800} sx={{ mb: 1, lineHeight: 1.1, ...gradientTextSx }}>
          One platform.
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520, mb: 2 }}>
          PRISM delivers 24/7 specialist AI health companions for patients and a comprehensive
          operations console for administrators — all in one unified system.
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ width: '100%', maxWidth: 1200, mb: 1.5, mx: 'auto' }}>
          {PORTALS.map((portal) => (
            <HomePortalCard key={portal.id} portal={portal} onClick={() => navigate(portal.path)} />
          ))}
        </Stack>

        <Box sx={{ width: '100%', my: 1, height: '1px', background: GRADIENT_BRAND, opacity: 0.25 }} />

        <Stack direction="row" spacing={{ xs: 3, md: 6 }} flexWrap="wrap" justifyContent="center">
          {STATS.map((s) => (
            <Box key={s.label} textAlign="center">
              <Typography variant="h5" fontWeight={800} sx={gradientTextSx}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                {s.label}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      <HomeFooterMui />

      <Box
        sx={{
          flexShrink: 0,
          width: '100%',
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 1, md: 1.25 },
          textAlign: 'center',
          borderTop: 1,
          borderColor: 'divider',
          position: 'relative',
          zIndex: 1,
          boxSizing: 'border-box',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          © 2026 PRISM — Feuji AI/ML Data Science Team. Not a substitute for professional medical advice.
        </Typography>
      </Box>
    </Box>
  );
}
