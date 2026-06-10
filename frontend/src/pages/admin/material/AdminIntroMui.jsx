import { Box } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShieldIcon from '@mui/icons-material/Shield';
import LayersIcon from '@mui/icons-material/Layers';
import ChatIcon from '@mui/icons-material/Chat';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PsychologyIcon from '@mui/icons-material/Psychology';
import GroupsIcon from '@mui/icons-material/Groups';
import BoltIcon from '@mui/icons-material/Bolt';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import PortalMaterialShell from '../../../Components/material/PortalMaterialShell';
import MaterialLandingHero from '../../../Components/material/MaterialLandingHero';
import MaterialFeatureGrid from '../../../Components/material/MaterialFeatureGrid';
import MaterialFixedActionBar from '../../../Components/material/MaterialFixedActionBar';

const METRICS = [
  { title: 'RAGAS Metrics', description: 'Retrieval-Augmented Generation Assessment Scoring to evaluate faithfulness, answer relevance, and context recall.', icon: TrendingUpIcon, color: '#E91E63' },
  { title: 'Governance & Security', description: 'RBAC protocols and clinical disclaimer compliance monitoring', icon: ShieldIcon, color: '#0D47A1' },
  { title: 'Pre-RAG Readiness', description: 'A 19-dimension document quality scoring system ensuring data integrity before indexing.', icon: LayersIcon, color: '#EF6C00' },
  { title: 'Patient Feedback', description: 'Aggregated patient sentiment, ratings, and qualitative feedback for continuous improvement.', icon: ChatIcon, color: '#2E7D32' },
  { title: 'Upload & Crawl', description: 'Dynamic ingestion pipeline for medical documents and automated web crawling from PubMed and CDC.', icon: CloudUploadIcon, color: '#7B1FA2' },
  { title: 'Agent Performance', description: 'Comparative analysis of performance metrics across all disease-specific primary agents.', icon: PsychologyIcon, color: '#C2185B' },
  { title: 'Agent Registry', description: 'Detailed hierarchy and management of primary agents, specialists, and human escalation paths.', icon: GroupsIcon, color: '#3949AB' },
  { title: 'LLM Calls', description: 'Real-time telemetry and logging for every large language model interaction and token usage.', icon: BoltIcon, color: '#F9A825' },
  { title: 'Alerts', description: 'Proactive system monitoring and critical alerts for immediate operational response.', icon: NotificationsIcon, color: '#C62828' },
  { title: 'PRISM Health', description: 'Real-time infrastructure health monitoring for APIs, databases, and model providers.', icon: MonitorHeartIcon, color: '#00897B' },
  { title: 'Escalation Summary', description: 'Tracking and analysis of patient escalations to human specialists and medical teams.', icon: SupportAgentIcon, color: '#FB8C00' },
  { title: 'Quality Score', description: 'Advanced metrics evaluating the clinical accuracy and empathy of patient interactions.', icon: CheckCircleIcon, color: '#388E3C' },
  { title: 'Recommendation 360° View', description: 'AI-driven action plan synthesizing RAGAS, feedback, alerts, escalations, and quality metrics.', icon: TrackChangesIcon, color: '#1565C0' },
];

export default function AdminIntroMui() {
  const navigate = useNavigate();

  return (
    <PortalMaterialShell portalLabel="Admin Console" fallbackPath="/" avatarLetter="A">
      <Box sx={{ pb: 12, px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 3 } }}>
        <MaterialLandingHero
          sx={{ mb: 4 }}
          title="PRISM"
          highlight="Intelligence"
          subtitle="Real-time governance oversight for the PRISM clinical platform. Access dimension-level metrics and system control via the Command Centre."
          titleVariant="h4"
          subtitleVariant="body2"
          titleMaxWidth={640}
          subtitleMaxWidth={640}
        />

        <MaterialFeatureGrid
          items={METRICS}
          columns={{ xs: 12, sm: 6, md: 4, lg: 3 }}
          layout="vertical"
        />

        <MaterialFixedActionBar
          action={{
            label: 'Launch Command Centre',
            endIcon: <ArrowForwardIcon />,
            onClick: () => navigate('/admin'),
          }}
          caption="AUTHORIZED ACCESS ONLY • LIVE DATA PIPELINE"
        />
      </Box>
    </PortalMaterialShell>
  );
}
