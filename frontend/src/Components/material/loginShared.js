import { alpha } from '@mui/material';
import { GRADIENT_BRAND, GRADIENT_CARD_BORDER } from '../../themes/material/constants';

export const loginTitleGradientSx = {
  background: GRADIENT_BRAND,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

export const loginPaperSx = (accent = '#1565C0') => ({
  p: { xs: 3, sm: 4 },
  borderRadius: 3,
  border: '1px solid transparent',
  background: `linear-gradient(${alpha('#FFFFFF', 0.94)}, ${alpha('#FFFFFF', 0.88)}) padding-box, ${GRADIENT_CARD_BORDER} border-box`,
  backdropFilter: 'blur(14px)',
  boxShadow: `0 16px 48px ${alpha(accent, 0.14)}`,
});

/** @deprecated use loginPaperSx */
export const LOGIN_PAPER_SX = loginPaperSx();

export const demoBoxSx = (color) => ({
  p: 2,
  borderRadius: 2,
  bgcolor: alpha(color, 0.05),
  border: 1,
  borderColor: alpha(color, 0.12),
  background: `linear-gradient(135deg, ${alpha(color, 0.06)} 0%, ${alpha(color, 0.02)} 100%)`,
});

export const loginSubmitSx = (accent = '#1565C0') => ({
  py: 1.35,
  fontWeight: 700,
  background: GRADIENT_BRAND,
  boxShadow: `0 8px 24px ${alpha(accent, 0.3)}`,
  '&:hover': {
    background: 'linear-gradient(135deg, #0D47A1 0%, #00695C 55%, #1976D2 100%)',
    boxShadow: `0 10px 28px ${alpha(accent, 0.35)}`,
  },
});

export const adminLoginSubmitSx = {
  py: 1.35,
  fontWeight: 700,
  background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 48%, #00897B 100%)',
  boxShadow: '0 8px 24px rgba(13, 71, 161, 0.32)',
  '&:hover': {
    background: 'linear-gradient(135deg, #082a5e 0%, #0D47A1 45%, #00695C 100%)',
    boxShadow: '0 10px 28px rgba(13, 71, 161, 0.38)',
  },
};

export const loginToggleGroupSx = (accent = '#1565C0') => ({
  mb: 3,
  p: 0.5,
  borderRadius: 2,
  bgcolor: alpha(accent, 0.06),
  border: 1,
  borderColor: alpha(accent, 0.1),
  '& .MuiToggleButton-root': {
    border: 0,
    borderRadius: '8px !important',
    flex: 1,
    fontWeight: 600,
    textTransform: 'none',
  },
  '& .Mui-selected': {
    color: '#fff !important',
    background: `${GRADIENT_BRAND} !important`,
  },
});
