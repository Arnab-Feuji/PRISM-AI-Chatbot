import { Box, alpha } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ActivityIcon from '@mui/icons-material/Favorite';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ShieldIcon from '@mui/icons-material/Shield';
import LanguageIcon from '@mui/icons-material/Language';
import LayersIcon from '@mui/icons-material/Layers';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import ChatIcon from '@mui/icons-material/Chat';
import VideocamIcon from '@mui/icons-material/Videocam';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import DescriptionIcon from '@mui/icons-material/Description';
import { useNavigate } from 'react-router-dom';
import PortalMaterialShell from '../../../Components/material/PortalMaterialShell';
import MaterialLandingHero from '../../../Components/material/MaterialLandingHero';
import MaterialFeatureGrid from '../../../Components/material/MaterialFeatureGrid';
import MaterialTrustStrip from '../../../Components/material/MaterialTrustStrip';

const FEATURES = [
  { icon: ActivityIcon, title: '5 Disease Domains', desc: 'Specialized care for chronic conditions.' },
  { icon: PsychologyIcon, title: '30 Specialist AI Agents', desc: 'Expert companions for every health journey.' },
  { icon: ShieldIcon, title: 'Evidence-Based Care', desc: 'Answers backed by PubMed, CDC, and WHO.' },
  { icon: LanguageIcon, title: 'Multilingual Support', desc: 'English, Spanish, Hindi, Telugu, and more.' },
  { icon: LayersIcon, title: 'Multimodal Support', desc: 'Interact via text, images, and voice.' },
  { icon: DownloadIcon, title: 'Prescription Download', desc: 'Securely download AI medical prescriptions.' },
  { icon: HistoryIcon, title: 'Long Term Memory', desc: 'Personalized longitudinal care history.' },
  { icon: ChatIcon, title: 'Patient Engagement', desc: 'Interactive tools to keep you active.' },
  { icon: VideocamIcon, title: 'Tele Medicine', desc: 'Seamlessly connect with human specialists.' },
  { icon: DownloadIcon, title: 'Chat Message Download', desc: 'Securely download your chat history.' },
  { icon: ThumbUpIcon, title: 'Patient Feedback', desc: 'Rate and review your AI care experience.' },
  { icon: DescriptionIcon, title: 'Medical Document Analysis', desc: 'AI-driven analysis of your medical records.' },
];

const TRUST_SOURCES = ['PubMed', 'CDC', 'WHO', 'PAHO', 'ASCO'];

const sectionSx = {
  position: 'relative',
  zIndex: 1,
  width: '100%',
  maxWidth: 1280,
  mx: 'auto',
  px: { xs: 2, sm: 3 },
  py: { xs: 0.5, sm: 1 },
  boxSizing: 'border-box',
};

export default function PatientLandingMui() {
  const navigate = useNavigate();

  return (
    <PortalMaterialShell portalLabel="Patient Portal" fallbackPath="/" gradient>
      {/* Hero — mirrors classic PatientLanding hero section */}
      <Box
        component="section"
        sx={{
          ...sectionSx,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <MaterialLandingHero
          compact
          gradientHighlight
          highlightOnNewLine
          sx={{ mb: 0 }}
          chip={{
            label: 'Trusted by 10k+ Patients Across LATAM',
            gradient: true,
            pulseDot: true,
          }}
          title="Personalised AI care"
          highlight="at your fingertips."
          subtitle="Evidence-based guidance for Cancer, Diabetes, Cardiovascular, Mental Health & Respiratory care. Your health companion, available 24/7."
          subtitleMaxWidth={512}
          action={{
            label: 'Get Started',
            endIcon: <ArrowForwardIcon sx={{ fontSize: 18 }} />,
            onClick: () => navigate('/login?role=patient'),
          }}
        />
      </Box>

      {/* Feature grid band — mirrors classic bordered flex-1 section */}
      <Box
        component="section"
        sx={{
          ...sectionSx,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          borderTop: 1,
          borderBottom: 1,
          borderColor: alpha('#1565C0', 0.1),
          background: `linear-gradient(180deg, ${alpha('#1565C0', 0.05)} 0%, ${alpha('#00897B', 0.04)} 50%, ${alpha('#42A5F5', 0.03)} 100%)`,
          overflow: 'hidden',
        }}
      >
        <MaterialFeatureGrid
          items={FEATURES}
          columns={{ xs: 6, lg: 4 }}
          spacing={1}
          size="compact"
          gradient
          sx={{ width: '100%' }}
        />
      </Box>

      {/* Trust strip — mirrors classic footer section */}
      <Box component="section" sx={{ ...sectionSx, textAlign: 'center' }}>
        <MaterialTrustStrip sources={TRUST_SOURCES} compact />
      </Box>
    </PortalMaterialShell>
  );
}
