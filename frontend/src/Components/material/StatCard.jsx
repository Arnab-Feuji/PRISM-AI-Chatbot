import { Card, CardContent, Typography } from '@mui/material';

export default function StatCard({ label, value, detail, color = 'primary.main' }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}
        >
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={800} sx={{ my: 1 }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color, fontWeight: 600 }}>
          {detail}
        </Typography>
      </CardContent>
    </Card>
  );
}
