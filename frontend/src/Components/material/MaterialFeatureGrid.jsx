import { Grid } from '@mui/material';
import MaterialFeatureCard from './MaterialFeatureCard';

export default function MaterialFeatureGrid({
  items,
  columns = { xs: 12, sm: 6, md: 4 },
  layout = 'horizontal',
  size = 'default',
  gradient = false,
  defaultColor = 'primary.main',
  hoverShadow,
  spacing = 2,
  sx,
}) {
  return (
    <Grid container spacing={spacing} sx={{ width: '100%', m: 0, ...sx }}>
      {items.map((item) => (
        <Grid key={item.title} size={columns}>
          <MaterialFeatureCard
            icon={item.icon}
            title={item.title}
            description={item.description ?? item.desc}
            color={item.color ?? defaultColor}
            layout={layout}
            size={size}
            gradient={gradient}
            hoverShadow={hoverShadow}
          />
        </Grid>
      ))}
    </Grid>
  );
}
