import { createTheme, alpha } from '@mui/material/styles';

const primary = '#1565C0';
const secondary = '#00897B';

export const patientMuiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: primary,
      light: '#42A5F5',
      dark: '#0D47A1',
      contrastText: '#fff',
    },
    secondary: {
      main: secondary,
      contrastText: '#fff',
    },
    background: {
      default: '#F4F7FB',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A2332',
      secondary: '#5C6B7A',
    },
    divider: alpha('#1A2332', 0.08),
    error: { main: '#D32F2F' },
    warning: { main: '#ED6C02' },
    success: { main: '#2E7D32' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#F4F7FB' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, padding: '10px 20px' },
        containedPrimary: {
          boxShadow: '0 4px 14px rgba(21,101,192,.25)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${alpha('#1A2332', 0.08)}`,
          boxShadow: '0 4px 12px rgba(16,24,40,.08)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#1A2332',
          borderBottom: `1px solid ${alpha('#1A2332', 0.08)}`,
          boxShadow: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
  },
});

export function syncMuiCssVariables(theme) {
  const root = document.documentElement;
  root.classList.add('material-patient');
  root.classList.remove('material-admin');
  root.style.setProperty('--bg-main', theme.palette.background.default);
  root.style.setProperty('--bg-card', theme.palette.background.paper);
  root.style.setProperty('--accent', theme.palette.primary.main);
  root.style.setProperty('--accent-glow', alpha(theme.palette.primary.main, 0.2));
  root.style.setProperty('--text-main', theme.palette.text.primary);
  root.style.setProperty('--text-dim', theme.palette.text.secondary);
  root.style.setProperty('--border', theme.palette.divider);
  root.style.setProperty('--grad-primary', `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`);
  root.style.setProperty('--success', theme.palette.success.main);
  root.style.setProperty('--error', theme.palette.error.main);
  root.style.setProperty('--warning', theme.palette.warning.main);
}

export function clearMuiCssVariables() {
  const root = document.documentElement;
  root.classList.remove('material-admin', 'material-patient');
  [
    '--bg-main', '--bg-card', '--accent', '--accent-glow',
    '--text-main', '--text-dim', '--border', '--grad-primary',
    '--success', '--error', '--warning',
  ].forEach((v) => root.style.removeProperty(v));
}
