import { Avatar, Box, Stack, Typography, alpha } from '@mui/material';
import { GRADIENT_BRAND } from '../../themes/material/constants';

export default function PortalBrandLockup({
  portalLabel,
  avatarSize = 40,
  gradientAvatar = false,
  avatarLetter = 'P',
  variant = 'default',
}) {
  const isPortal = variant === 'portal';
  const titleSx = isPortal
    ? { m: 0, p: 0, lineHeight: 1, fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.025em' }
    : { m: 0, p: 0, lineHeight: 1, display: 'flex', alignItems: 'center' };
  const labelSx = isPortal
    ? { m: 0, p: 0, lineHeight: 1, fontSize: '0.75rem', mt: '-2px' }
    : { m: 0, p: 0, lineHeight: 1, display: 'block', mt: '-3px' };
  const avatar = (
    <Avatar
      sx={{
        width: avatarSize,
        height: avatarSize,
        fontWeight: 800,
        fontSize: avatarSize * 0.45,
        flexShrink: 0,
        ...(gradientAvatar
          ? {
              background: GRADIENT_BRAND,
              color: '#fff',
              boxShadow: '0 4px 14px rgba(21,101,192,0.35)',
            }
          : {
              bgcolor: 'primary.main',
              boxShadow: (theme) => `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
            }),
      }}
    >
      {avatarLetter}
    </Avatar>
  );

  if (!portalLabel) {
    return (
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
        {avatar}
        <Typography variant={isPortal ? undefined : 'subtitle1'} fontWeight={800} sx={titleSx}>
          PRISM
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
      {avatar}
      <Box sx={{ minWidth: 0, textAlign: 'left', lineHeight: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Typography variant={isPortal ? undefined : 'subtitle1'} fontWeight={800} sx={titleSx}>
          PRISM
        </Typography>
        <Typography variant={isPortal ? undefined : 'caption'} color="text.secondary" sx={labelSx}>
          {portalLabel}
        </Typography>
      </Box>
    </Stack>
  );
}
