import { Box, Typography, Button, Chip, Stack, alpha } from '@mui/material';
import { GRADIENT_BRAND } from '../../themes/material/constants';

const gradientTextSx = {
  background: GRADIENT_BRAND,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

export default function MaterialLandingHero({
  chip,
  title,
  highlight,
  highlightOnNewLine = false,
  subtitle,
  action,
  titleVariant = 'h3',
  subtitleVariant = 'body1',
  titleMaxWidth = 720,
  subtitleMaxWidth = 560,
  centered = true,
  compact = false,
  gradientHighlight = false,
  sx,
}) {
  const titleSx = compact
    ? {
        maxWidth: titleMaxWidth,
        mx: centered ? 'auto' : undefined,
        fontSize: { xs: '1.5rem', md: '2.25rem' },
        fontWeight: 900,
        lineHeight: 0.95,
        letterSpacing: '-0.02em',
      }
    : { maxWidth: titleMaxWidth, mx: centered ? 'auto' : undefined, fontWeight: 800 };

  const subtitleSx = compact
    ? {
        maxWidth: subtitleMaxWidth,
        mx: centered ? 'auto' : undefined,
        fontSize: { xs: '0.75rem', md: '0.875rem' },
        lineHeight: 1.625,
        fontWeight: 500,
      }
    : { maxWidth: subtitleMaxWidth, mx: centered ? 'auto' : undefined };

  const highlightEl = highlight && (
    highlightOnNewLine ? (
      <>
        <br />
        <Box component="span" sx={gradientHighlight ? gradientTextSx : { color: 'primary.main' }}>
          {highlight}
        </Box>
      </>
    ) : (
      <>
        {' '}
        <Box component="span" sx={gradientHighlight ? gradientTextSx : { color: 'primary.main' }}>
          {highlight}
        </Box>
      </>
    )
  );

  return (
    <Stack
      spacing={compact ? 0.75 : 2}
      alignItems={centered ? 'center' : undefined}
      textAlign={centered ? 'center' : undefined}
      sx={sx}
    >
      {chip && (
        <Chip
          label={chip.label}
          color={chip.color}
          variant={chip.variant ?? (chip.gradient ? 'filled' : 'outlined')}
          size={chip.size ?? 'small'}
          icon={
            chip.pulseDot ? (
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: chip.gradient ? '#fff' : 'primary.main',
                  ml: 1,
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.4 },
                  },
                }}
              />
            ) : undefined
          }
          sx={{
            fontWeight: 900,
            fontSize: chip.gradient ? '0.5625rem' : undefined,
            letterSpacing: chip.gradient ? '0.12em' : undefined,
            textTransform: chip.gradient ? 'uppercase' : undefined,
            ...(chip.gradient
              ? {
                  color: '#fff',
                  background: GRADIENT_BRAND,
                  border: 'none',
                  boxShadow: `0 4px 16px ${alpha('#1565C0', 0.28)}`,
                  '& .MuiChip-icon': { ml: 0.5 },
                }
              : {}),
            ...(chip.sx ?? {}),
          }}
        />
      )}

      <Typography variant={compact ? undefined : titleVariant} sx={titleSx}>
        {title}
        {highlightEl}
      </Typography>

      {subtitle && (
        <Typography
          variant={compact ? undefined : subtitleVariant}
          color="text.secondary"
          sx={subtitleSx}
        >
          {subtitle}
        </Typography>
      )}

      {action && (
        <Button
          variant={action.variant ?? 'contained'}
          size={action.size ?? (compact ? 'medium' : 'large')}
          endIcon={action.endIcon}
          onClick={action.onClick}
          sx={{
            mt: action.mt ?? (compact ? 0.5 : 1),
            px: action.px ?? (compact ? 4 : undefined),
            py: compact ? 1.25 : undefined,
            fontWeight: 900,
            fontSize: compact ? '0.75rem' : undefined,
            letterSpacing: compact ? '0.12em' : undefined,
            textTransform: compact ? 'uppercase' : undefined,
            background: action.gradient !== false ? GRADIENT_BRAND : undefined,
            boxShadow: compact ? `0 8px 24px ${alpha('#1565C0', 0.25)}` : undefined,
            '&:hover': {
              background: action.gradient !== false
                ? 'linear-gradient(135deg, #0D47A1 0%, #00695C 55%, #1976D2 100%)'
                : undefined,
              transform: compact ? 'translateY(-2px)' : undefined,
            },
            transition: 'transform 0.2s, background 0.2s',
            ...(action.sx ?? {}),
          }}
        >
          {action.label}
        </Button>
      )}
    </Stack>
  );
}

