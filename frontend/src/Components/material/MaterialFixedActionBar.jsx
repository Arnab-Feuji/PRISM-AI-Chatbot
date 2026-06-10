import { Box, Button, Stack, Typography, alpha } from '@mui/material';

export default function MaterialFixedActionBar({ action, caption, sx }) {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: alpha('#FFFFFF', 0.95),
        backdropFilter: 'blur(8px)',
        py: 2,
        px: 2,
        ...sx,
      }}
    >
      <Stack alignItems="center" spacing={1}>
        <Button
          variant={action.variant ?? 'contained'}
          size={action.size ?? 'large'}
          endIcon={action.endIcon}
          onClick={action.onClick}
          sx={{ px: action.px ?? 4, ...(action.sx ?? {}) }}
        >
          {action.label}
        </Button>
        {caption && (
          <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 2, fontWeight: 700 }}>
            {caption}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
