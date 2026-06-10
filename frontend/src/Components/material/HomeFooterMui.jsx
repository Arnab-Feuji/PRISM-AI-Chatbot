import {
  Box,
  Typography,
  Paper,
  Stack,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Link,
  alpha,
  Tooltip,
} from '@mui/material';
import MonitorIcon from '@mui/icons-material/Monitor';
import TabletIcon from '@mui/icons-material/Tablet';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import PaletteIcon from '@mui/icons-material/Palette';
import DevicesIcon from '@mui/icons-material/Devices';
import { useThemeStore } from '../../store/theme';
import { useDeviceStore } from '../../store/device';
import { THEME_PICKER_OPTIONS } from '../../themes/material/constants';

const LEGAL_LINKS = ['Privacy Policy', 'Terms of Service', 'Security'];

const controlPaperSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
  px: 2.5,
  py: 1,
  borderRadius: 10,
  bgcolor: alpha('#FFFFFF', 0.85),
  backdropFilter: 'blur(10px)',
  border: '1px solid',
  borderColor: alpha('#1565C0', 0.12),
  flexShrink: 0,
};

const labelStackSx = {
  pr: 2,
  borderRight: 1,
  borderColor: alpha('#1565C0', 0.12),
};

export default function HomeFooterMui() {
  const { currentTheme, setTheme } = useThemeStore();
  const { currentDevice, setDevice } = useDeviceStore();

  return (
    <Box
      sx={{
        flexShrink: 0,
        width: '100%',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 1.25, md: 1.5 },
        position: 'relative',
        zIndex: 1,
        borderTop: `1px solid ${alpha('#1565C0', 0.1)}`,
        bgcolor: alpha('#FFFFFF', 0.72),
        backdropFilter: 'blur(10px)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        useFlexGap
        sx={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}
      >
        <Paper elevation={0} sx={controlPaperSx}>
          <Stack direction="row" alignItems="center" spacing={1} sx={labelStackSx}>
            <DevicesIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              Device Mode
            </Typography>
          </Stack>
          <ToggleButtonGroup value={currentDevice} exclusive onChange={(_, v) => v && setDevice(v)} size="small">
            <ToggleButton value="desktop" aria-label="Desktop"><Tooltip title="Desktop"><MonitorIcon fontSize="small" /></Tooltip></ToggleButton>
            <ToggleButton value="tablet" aria-label="Tablet"><Tooltip title="iPad / Tablet"><TabletIcon fontSize="small" /></Tooltip></ToggleButton>
            <ToggleButton value="mobile" aria-label="Mobile"><Tooltip title="Mobile Phone"><SmartphoneIcon fontSize="small" /></Tooltip></ToggleButton>
          </ToggleButtonGroup>
        </Paper>

        <Paper elevation={0} sx={controlPaperSx}>
          <Stack direction="row" alignItems="center" spacing={1} sx={labelStackSx}>
            <PaletteIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              Select Theme
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            {THEME_PICKER_OPTIONS.map((t) => (
              <Tooltip key={t.id} title={t.name}>
                <IconButton
                  onClick={() => setTheme(t.id)}
                  size="small"
                  sx={{
                    p: 0.5,
                    border: 2,
                    borderColor: currentTheme === t.id ? 'primary.main' : 'transparent',
                    transform: currentTheme === t.id ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.2s',
                  }}
                >
                  <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: t.color }} />
                </IconButton>
              </Tooltip>
            ))}
          </Stack>
        </Paper>
      </Stack>

      <Box component="nav" aria-label="Legal" sx={{ mt: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          {LEGAL_LINKS.map((item) => (
            <Link key={item} href="#" underline="hover" color="text.secondary" variant="caption" sx={{ whiteSpace: 'nowrap' }}>
              {item}
            </Link>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
