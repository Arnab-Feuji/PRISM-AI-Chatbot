import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Stack,
  CircularProgress,
  Chip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ShieldIcon from '@mui/icons-material/Shield';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/auth';
import PortalMaterialShell from '../../../Components/material/PortalMaterialShell';
import {
  loginPaperSx,
  demoBoxSx,
  adminLoginSubmitSx,
  loginTitleGradientSx,
} from '../../../Components/material/loginShared';

export default function AdminLoginMui() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login, logout } = useAuthStore();
  const role = params.get('role') || 'admin';

  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user, warning } = await login(form.email, form.password);
      if (warning) toast(warning, { icon: '⚠️', duration: 6000 });
      if (role && user.role !== role) {
        logout();
        toast.error(`Authorized ${role} access only.`);
        return;
      }
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/admin-intro');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalMaterialShell
      portalLabel="Admin Console"
      fallbackPath="/"
      avatarLetter="A"
      centered
      gradient
      gradientTone="admin"
    >
      <Box sx={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        <Stack spacing={1} sx={{ mb: 3, textAlign: 'center', alignItems: 'center' }}>
          <Chip
            icon={<ShieldIcon sx={{ fontSize: '14px !important' }} />}
            label="Authorized Access Only"
            size="small"
            sx={{
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontSize: '0.625rem',
              color: '#fff',
              background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 50%, #00897B 100%)',
              border: 'none',
              '& .MuiChip-icon': { color: '#fff' },
            }}
          />
          <Typography variant="h5" fontWeight={800}>
            Admin sign in to{' '}
            <Box component="span" sx={loginTitleGradientSx}>
              PRISM
            </Box>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Executive operational oversight
          </Typography>
        </Stack>

        <Paper elevation={0} sx={loginPaperSx('#0D47A1')}>
          <Box component="form" onSubmit={submit}>
            <Stack spacing={2.5}>
              <TextField label="Email" type="email" placeholder="admin@prism.ai" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required fullWidth />
              <TextField
                label="Password"
                type={show ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
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

              <Box sx={demoBoxSx('#0D47A1')}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" gutterBottom>Demo account</Typography>
                <Typography variant="caption" display="block"><strong>Admin:</strong> admin@prism.ai / admin123</Typography>
              </Box>

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                sx={adminLoginSubmitSx}
              >
                {loading ? 'Authenticating…' : 'Secure Admin Login'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </PortalMaterialShell>
  );
}
