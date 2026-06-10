import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Avatar,
  Divider,
  alpha,
} from '@mui/material';
import MessageIcon from '@mui/icons-material/Message';
import ActivityIcon from '@mui/icons-material/Favorite';
import BoltIcon from '@mui/icons-material/Bolt';
import AddIcon from '@mui/icons-material/Add';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useAuthStore } from '../../../store/auth';
import { formatHeaderDate, formatShortDate, getTimeGreeting } from '../../../utils/datetime';
import StatCard from '../../../Components/material/StatCard';

const DISEASE_METADATA = {
  CA: { name: 'Cancer Care', icon: '🎗️', agents: ['CA1', 'CA2', 'CA3', 'CA4', 'CA5'], meta: ['Screening', 'Treatment', 'Support', 'Survivorship', 'Genetics'], price: 39 },
  DM: { name: 'Diabetes Care', icon: '💧', agents: ['DM1', 'DM2', 'DM3', 'DM4', 'DM5'], meta: ['Monitoring', 'Medication', 'Nutrition', 'Complications', 'Lifestyle'], price: 29 },
  CV: { name: 'Cardiovascular', icon: '❤️', agents: ['CV1', 'CV2', 'CV3', 'CV4', 'CV5'], meta: ['Clinical', 'Emergency', 'Medication', 'Rehab', 'Nutrition'], price: 29 },
  MH: { name: 'Mental Health', icon: '🧠', agents: ['MH1', 'MH2', 'MH3', 'MH4', 'MH5'], meta: ['Depression', 'Anxiety', 'Sleep', 'Trauma', 'Crisis'], price: 24 },
  RS: { name: 'Respiratory', icon: '🫁', agents: ['RS1', 'RS2', 'RS3', 'RS4', 'RS5'], meta: ['Asthma', 'COPD', 'Rehab', 'Medication', 'OSA'], price: 24 },
};

const AGENT_ICONS = [ActivityIcon, BoltIcon, AddIcon, ActivityIcon, TrendingUpIcon];

const STATUS_COLOR = {
  high: 'error.main',
  warning: 'warning.main',
  good: 'success.main',
};

export default function PatientDashboardMui() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { trialDaysLeft, trialEndLabel, nextBillingLabel, renewedLabel, labReportLabel } = useMemo(() => {
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 5);
    const nextBilling = new Date(now);
    nextBilling.setMonth(nextBilling.getMonth() + 1);
    const renewed = new Date(now);
    renewed.setDate(renewed.getDate() - 18);
    const labReport = new Date(now);
    labReport.setDate(labReport.getDate() - 3);
    return {
      trialDaysLeft: 5,
      trialEndLabel: formatShortDate(trialEnd),
      nextBillingLabel: formatShortDate(nextBilling),
      renewedLabel: formatShortDate(renewed),
      labReportLabel: formatShortDate(labReport),
    };
  }, []);

  const stats = [
    { label: 'Active Care Plans', value: '2', detail: '↑ Diabetes + Cardiovascular', color: 'primary.main' },
    { label: 'Specialist Agents', value: '10', detail: 'DM1–DM5 · CV1–CV5', color: 'primary.main' },
    { label: 'Conversations', value: '47', detail: 'This month', color: 'success.main' },
    { label: 'Days until billing', value: String(trialDaysLeft), detail: `Trial ends ${trialEndLabel}`, color: 'error.main' },
  ];

  const subs = user?.subscribed_diseases || [];
  const activePlans = subs
    .map((code) => {
      const meta = DISEASE_METADATA[code.toUpperCase()];
      if (!meta) return null;
      return {
        id: code.toLowerCase(),
        name: meta.name,
        icon: meta.icon,
        agents: meta.agents,
        agentsMeta: meta.meta,
        status: 'Active',
        renewDate: `Next billing: ${nextBillingLabel}`,
        price: meta.price,
      };
    })
    .filter(Boolean);

  const displayPlans =
    activePlans.length > 0
      ? activePlans
      : [
          {
            id: 'ca',
            name: 'Cancer Care (Demo)',
            icon: '🎗️',
            agents: ['CA1', 'CA2', 'CA3', 'CA4', 'CA5'],
            agentsMeta: ['Screening', 'Treatment', 'Support', 'Survivorship', 'Genetics'],
            status: 'Trial — 7 days left',
            renewDate: `Renewed ${renewedLabel}`,
            price: 39,
          },
        ];

  const healthSnapshot = [
    { label: 'Fasting glucose', value: '187', unit: 'mg/dL', status: 'high' },
    { label: 'HbA1c', value: '8.2', unit: '%', status: 'high' },
    { label: 'Blood pressure', value: '142/91', unit: '', status: 'warning' },
    { label: 'BMI', value: '28.4', unit: '', status: 'warning' },
    { label: 'Steps today', value: '4,820', unit: '', status: 'good' },
  ];

  const recentActivity = [
    { type: 'AI Insight', msg: 'New research on Metformin usage...', time: '2h ago' },
    { type: 'Medication', msg: 'Dosage updated for CA-2 agent', time: '1d ago' },
    { type: 'Report', msg: `Lab results from ${labReportLabel} processed`, time: '3d ago' },
  ];

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            {getTimeGreeting()},{' '}
            <Box component="span" sx={{ color: 'primary.main' }}>
              {user?.name || 'María'}
            </Box>{' '}
            👋
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatHeaderDate()} · Your agents are active
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => navigate('/plans')}>
          Manage subscriptions
        </Button>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {stats.map((s) => (
          <Grid key={s.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            {displayPlans.map((plan) => (
              <Card key={plan.id}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                    <Stack direction="row" spacing={2}>
                      <Avatar
                        variant="rounded"
                        sx={{ width: 64, height: 64, fontSize: 28, bgcolor: alpha('#1565C0', 0.08) }}
                      >
                        {plan.icon}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight={800}>
                          {plan.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {plan.agents.length} agents · {plan.renewDate}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Chip label={plan.status} size="small" color="primary" variant="outlined" />
                        </Box>
                      </Box>
                    </Stack>
                    <Box textAlign="right">
                      <Typography variant="h5" fontWeight={800}>
                        ${plan.price}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        /month
                      </Typography>
                    </Box>
                  </Stack>

                  <Grid container spacing={1.5} sx={{ mb: 3 }}>
                    {plan.agents.map((agent, i) => {
                      const Icon = AGENT_ICONS[i] || ActivityIcon;
                      return (
                        <Grid key={agent} size={{ xs: 6, sm: 4, lg: 2.4 }}>
                          <Box
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              border: 1,
                              borderColor: 'divider',
                              textAlign: 'center',
                              transition: 'all 0.2s',
                              '&:hover': { borderColor: 'primary.main', bgcolor: alpha('#1565C0', 0.04) },
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                mx: 'auto',
                                mb: 0.5,
                                bgcolor: alpha('#1565C0', 0.08),
                                color: 'primary.main',
                              }}
                            >
                              <Icon sx={{ fontSize: 16 }} />
                            </Avatar>
                            <Typography variant="caption" fontWeight={700} display="block">
                              {agent}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {plan.agentsMeta[i]}
                            </Typography>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<MessageIcon />}
                    onClick={() => navigate('/app')}
                  >
                    Open {plan.name} Chat
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}
                  gutterBottom
                >
                  Tracked Metrics
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={2}>
                  {healthSnapshot.map((item) => (
                    <Stack key={item.label} direction="row" justifyContent="space-between" alignItems="flex-end">
                      <Typography variant="body2" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Box textAlign="right">
                        <Typography variant="h6" fontWeight={800} sx={{ color: STATUS_COLOR[item.status] }}>
                          {item.value}
                          {item.unit && (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                              {item.unit}
                            </Typography>
                          )}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={800} gutterBottom>
                  Recent activity
                </Typography>
                <Stack spacing={1.5} divider={<Divider />}>
                  {recentActivity.map((act) => (
                    <Stack key={act.msg} direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="caption" color="primary" fontWeight={700}>
                          {act.type}
                        </Typography>
                        <Typography variant="body2">{act.msg}</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {act.time}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
