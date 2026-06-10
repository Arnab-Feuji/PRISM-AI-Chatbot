import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Stack,
  Avatar,
  Box,
  alpha,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { GRADIENT_BRAND, GRADIENT_CARD_BORDER } from '../../themes/material/constants';

export default function HomePortalCard({ portal, onClick }) {
  const Icon = portal.icon;
  const accentGradient =
    portal.id === 'patient'
      ? 'linear-gradient(90deg, #1565C0, #42A5F5)'
      : 'linear-gradient(90deg, #00897B, #26A69A)';
  const iconGradient =
    portal.id === 'patient'
      ? 'linear-gradient(135deg, #1565C0, #42A5F5)'
      : 'linear-gradient(135deg, #00897B, #26A69A)';

  return (
    <Card
      sx={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: alpha('#FFFFFF', 0.92),
        backdropFilter: 'blur(8px)',
        transition: 'all 0.25s ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          padding: '1px',
          background: GRADIENT_CARD_BORDER,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: accentGradient,
        },
        '&:hover': {
          boxShadow: `0 16px 40px ${alpha(portal.color, 0.18)}`,
          transform: 'translateY(-3px)',
        },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        <CardContent sx={{ textAlign: 'left', p: 2, pt: 2.5, '&:last-child': { pb: 2 } }}>
          <Avatar
            variant="rounded"
            sx={{
              background: iconGradient,
              color: '#fff',
              width: 44,
              height: 44,
              mb: 1,
              boxShadow: `0 6px 16px ${alpha(portal.color, 0.35)}`,
            }}
          >
            <Icon />
          </Avatar>
          <Typography
            variant="caption"
            sx={{
              background: GRADIENT_BRAND,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 800,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            {portal.label}
          </Typography>
          <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5, mb: 0.75 }}>
            {portal.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {portal.description}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{
                background: accentGradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {portal.cta}
            </Typography>
            <ArrowForwardIcon sx={{ fontSize: 18, color: portal.color }} />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
