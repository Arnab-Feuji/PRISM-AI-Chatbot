import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  MenuItem,
  InputAdornment,
  IconButton,
  Stack,
  CircularProgress,
  Chip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FavoriteIcon from '@mui/icons-material/Favorite';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/auth';
import PortalMaterialShell from '../../../Components/material/PortalMaterialShell';
import { LATAM_COUNTRIES } from '../../../themes/material/constants';
import {
  loginPaperSx,
  demoBoxSx,
  loginSubmitSx,
  loginToggleGroupSx,
  loginTitleGradientSx,
} from '../../../Components/material/loginShared';

export default function PatientLoginMui() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login, register, logout } = useAuthStore();
  const role = params.get('role') || 'patient';

  const [mode, setMode] = useState(params.get('register') ? 'register' : 'login');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', country: 'Mexico' });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const { user, warning } = await login(form.email, form.password);
        if (warning) toast(warning, { icon: '⚠️', duration: 6000 });
        if (role && user.role !== role) {
          logout();
          toast.error(`Authorized ${role} access only.`);
          return;
        }
        toast.success(`Welcome back, ${user.name}!`);
        navigate(user.role === 'admin' ? '/admin-intro' : '/app');
      } else {
        const user = await register(form.email, form.name, form.password, form.country);
        toast.success(`Welcome to PRISM, ${user.name}!`);
        navigate('/app');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalMaterialShell portalLabel="Patient Portal" fallbackPath="/patient" centered gradient>
      <Box sx={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        <Stack spacing={1} sx={{ mb: 3, textAlign: 'center', alignItems: 'center' }}>
          <Chip
            icon={<FavoriteIcon sx={{ fontSize: '14px !important' }} />}
            label="Patient Portal Access"
            size="small"
            sx={{
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontSize: '0.625rem',
              color: '#fff',
              background: 'linear-gradient(135deg, #1565C0 0%, #00897B 55%, #42A5F5 100%)',
              border: 'none',
              '& .MuiChip-icon': { color: '#fff' },
            }}
          />
          <Typography variant="h5" fontWeight={800}>
            {mode === 'login' ? (
              <>
                Sign in to{' '}
                <Box component="span" sx={loginTitleGradientSx}>
                  PRISM
                </Box>
              </>
            ) : (
              'Create your account'
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Patient-centric health intelligence
          </Typography>
        </Stack>

        <Paper elevation={0} sx={loginPaperSx('#1565C0')}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            fullWidth
            onChange={(_, v) => v && setMode(v)}
            sx={loginToggleGroupSx('#1565C0')}
          >
            <ToggleButton value="login">Sign In</ToggleButton>
            <ToggleButton value="register">Create Account</ToggleButton>
          </ToggleButtonGroup>

          <Box component="form" onSubmit={submit}>
            <Stack spacing={2.5}>
              {mode === 'register' && (
                <TextField label="Full Name" placeholder="Dr. Maria González" value={form.name} onChange={(e) => set('name', e.target.value)} required fullWidth />
              )}
              <TextField label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} required fullWidth />
              <TextField
                label="Password"
                type={show ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                required
                inputProps={{ minLength: 6 }}
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShow(!show)} edge="end" aria-label="Toggle password">
                        {show ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {mode === 'register' && (
                <TextField select label="Country (LATAM)" value={form.country} onChange={(e) => set('country', e.target.value)} fullWidth>
                  {LATAM_COUNTRIES.map((c) => (
                    <MenuItem key={c.code} value={c.label}>{c.label}</MenuItem>
                  ))}
                </TextField>
              )}

              <Box sx={demoBoxSx('#1565C0')}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" gutterBottom>Demo accounts</Typography>
                <Typography variant="caption" display="block"><strong>Patient:</strong> patient@prism.ai / demo123</Typography>
                <Typography variant="caption" display="block"><strong>Admin:</strong> admin@prism.ai / admin123</Typography>
              </Box>

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                sx={loginSubmitSx('#1565C0')}
              >
                {loading ? 'Authenticating…' : mode === 'login' ? 'Sign In to PRISM' : 'Create Account'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </PortalMaterialShell>
  );
}
