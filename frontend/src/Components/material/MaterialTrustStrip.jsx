import { Typography, Stack } from '@mui/material';

export default function MaterialTrustStrip({
  label = 'Built with Medical Evidence from',
  sources,
  compact = false,
  sx,
}) {
  return (
    <Stack alignItems="center" spacing={compact ? 0.5 : 2} sx={sx}>
      <Typography
        variant={compact ? undefined : 'caption'}
        color="text.secondary"
        sx={{
          textTransform: 'uppercase',
          letterSpacing: compact ? '0.4em' : 3,
          fontWeight: 900,
          ...(compact ? { fontSize: '0.5rem' } : {}),
        }}
      >
        {label}
      </Typography>
      <Stack
        direction="row"
        spacing={compact ? { xs: 3, md: 6 } : 3}
        flexWrap="wrap"
        justifyContent="center"
        sx={compact ? { opacity: 0.45 } : undefined}
      >
        {sources.map((src) => (
          <Typography
            key={src}
            variant={compact ? undefined : 'body2'}
            fontWeight={800}
            color="text.secondary"
            sx={compact ? { fontSize: '0.75rem' } : undefined}
          >
            {src}
          </Typography>
        ))}
      </Stack>
    </Stack>
  );
}
