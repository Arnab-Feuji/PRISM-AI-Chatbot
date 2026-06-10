import { Box } from '@mui/material';

export default function MaterialFullscreenShell({ children, className, sx = {} }) {
  return (
    <Box
      className={className}
      sx={{
        height: '100vh',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        color: 'text.primary',
        overflow: 'hidden',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
