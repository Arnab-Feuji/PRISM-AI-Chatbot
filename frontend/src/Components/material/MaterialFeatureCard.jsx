import { Card, CardContent, Typography, Avatar, Box, alpha } from '@mui/material';
import { GRADIENT_BRAND, GRADIENT_CARD_BORDER } from '../../themes/material/constants';

const PATIENT_HOVER = '0 8px 24px rgba(21,101,192,.12)';
const ADMIN_HOVER = '0 8px 24px rgba(13,71,161,.12)';

function resolveColor(color) {
  if (color === 'primary.main') return '#1565C0';
  return color;
}

export default function MaterialFeatureCard({
  icon: Icon,
  title,
  description,
  color = 'primary.main',
  layout = 'horizontal',
  size = 'default',
  gradient = false,
  hoverShadow,
}) {
  const resolved = resolveColor(color);
  const shadow = hoverShadow ?? (layout === 'horizontal' ? PATIENT_HOVER : ADMIN_HOVER);
  const isHorizontal = layout === 'horizontal';
  const isCompact = size === 'compact' && isHorizontal;

  const avatarSx = isCompact
    ? {
        width: 36,
        height: 36,
        flexShrink: 0,
        borderRadius: 2,
        background: gradient ? 'linear-gradient(135deg, rgba(21,101,192,0.15), rgba(0,137,123,0.12))' : alpha(resolved, 0.1),
        color: 'primary.main',
        transition: 'transform 0.2s',
      }
    : isHorizontal
      ? {
          bgcolor: alpha(resolved, 0.1),
          color: color === 'primary.main' ? 'primary.main' : resolved,
          width: 44,
          height: 44,
          flexShrink: 0,
        }
      : {
          width: 40,
          height: 40,
          mb: 1.5,
          bgcolor: alpha(resolved, 0.12),
          color: resolved,
        };

  const cardSx = isCompact
    ? {
        height: '100%',
        borderRadius: 3,
        bgcolor: alpha('#FFFFFF', 0.72),
        backdropFilter: 'blur(8px)',
        border: '1px solid',
        borderColor: alpha('#1565C0', 0.08),
        boxShadow: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
        '&:hover': {
          borderColor: alpha('#1565C0', 0.35),
          boxShadow: `0 6px 20px ${alpha('#1565C0', 0.12)}`,
          '& .MuiAvatar-root': { transform: 'scale(1.08)' },
        },
      }
    : gradient && isHorizontal
      ? {
          height: '100%',
          border: '1px solid transparent',
          background: `linear-gradient(${alpha('#FFFFFF', 0.9)}, ${alpha('#FFFFFF', 0.9)}) padding-box, ${GRADIENT_CARD_BORDER} border-box`,
          transition: 'box-shadow 0.2s, transform 0.2s',
          '&:hover': {
            boxShadow: shadow,
            transform: 'translateY(-1px)',
          },
        }
      : {
          height: '100%',
          transition: isHorizontal ? 'border-color 0.2s, box-shadow 0.2s' : 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: shadow,
          },
        };

  const contentSx = isCompact
    ? { display: 'flex', gap: 1.5, alignItems: 'center', py: 1.25, px: 1.25, '&:last-child': { pb: 1.25 } }
    : isHorizontal
      ? { display: 'flex', gap: 2, alignItems: 'flex-start' }
      : undefined;

  return (
    <Card elevation={0} sx={cardSx}>
      <CardContent sx={contentSx}>
        <Avatar variant="rounded" sx={avatarSx}>
          <Icon sx={{ fontSize: isCompact ? 18 : undefined }} />
        </Avatar>
        <Box sx={{ textAlign: 'left', minWidth: 0 }}>
          <Typography
            variant={isCompact ? undefined : 'subtitle2'}
            fontWeight={isHorizontal ? (isCompact ? 700 : 700) : 800}
            gutterBottom={!isCompact}
            sx={
              isCompact
                ? { fontSize: '0.8125rem', lineHeight: 1.25, mb: 0.25 }
                : undefined
            }
          >
            {title}
          </Typography>
          <Typography
            variant={isCompact ? undefined : isHorizontal ? 'body2' : 'caption'}
            color="text.secondary"
            sx={
              isCompact
                ? { fontSize: '0.625rem', lineHeight: 1.25 }
                : isHorizontal
                  ? undefined
                  : { lineHeight: 1.5 }
            }
          >
            {description}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
