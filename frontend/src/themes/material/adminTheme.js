import { createTheme, alpha } from '@mui/material/styles';

const primary = '#0D47A1';
const secondary = '#37474F';

export const adminMuiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: primary,
      light: '#5472D3',
      dark: '#002171',
      contrastText: '#fff',
    },
    secondary: {
      main: secondary,
      contrastText: '#fff',
    },
    background: {
      default: '#EEF2F7',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#102A43',
      secondary: '#627D98',
    },
    divider: alpha('#102A43', 0.1),
    error: { main: '#C62828' },
    warning: { main: '#EF6C00' },
    success: { main: '#2E7D32' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#EEF2F7' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, padding: '8px 18px' },
        containedPrimary: {
          boxShadow: '0 4px 14px rgba(13,71,161,.22)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: `1px solid ${alpha('#102A43', 0.08)}`,
          boxShadow: '0 2px 10px rgba(16,24,40,.06)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${alpha('#102A43', 0.08)}`,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginBottom: 4,
        },
      },
    },
  },
});

export function syncAdminMuiCssVariables(theme) {
  const root = document.documentElement;
  root.classList.add('material-admin');
  root.classList.remove('material-patient');
  root.style.setProperty('--bg-main', theme.palette.background.default);
  root.style.setProperty('--bg-card', theme.palette.background.paper);
  root.style.setProperty('--accent', theme.palette.primary.main);
  root.style.setProperty('--accent-glow', alpha(theme.palette.primary.main, 0.18));
  root.style.setProperty('--text-main', theme.palette.text.primary);
  root.style.setProperty('--text-dim', theme.palette.text.secondary);
  root.style.setProperty('--border', theme.palette.divider);
  root.style.setProperty('--grad-primary', `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`);
  root.style.setProperty('--success', theme.palette.success.main);
  root.style.setProperty('--error', theme.palette.error.main);
  root.style.setProperty('--warning', theme.palette.warning.main);
}
