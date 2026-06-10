import { Box, alpha, keyframes } from '@mui/material';

const floatA = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(18px, -22px) scale(1.06); }
`;

const floatB = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-20px, 16px) scale(1.04); }
`;

const floatC = keyframes`
  0%, 100% { transform: translate(0, 0); opacity: 0.55; }
  50% { transform: translate(10px, 12px); opacity: 0.85; }
`;

const shimmer = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

function AnimatedOrb({ sx }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        borderRadius: '50%',
        pointerEvents: 'none',
        ...sx,
      }}
    />
  );
}

function LoginBackground({ palette }) {
  return (
    <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <AnimatedOrb
        sx={{
          top: '6%',
          left: '-8%',
          width: { xs: 280, md: 420 },
          height: { xs: 280, md: 420 },
          background: `radial-gradient(circle, ${palette.a} 0%, transparent 70%)`,
          filter: 'blur(42px)',
          animation: `${floatA} 14s ease-in-out infinite`,
        }}
      />
      <AnimatedOrb
        sx={{
          top: '42%',
          right: '-10%',
          width: { xs: 260, md: 380 },
          height: { xs: 260, md: 380 },
          background: `radial-gradient(circle, ${palette.b} 0%, transparent 70%)`,
          filter: 'blur(46px)',
          animation: `${floatB} 18s ease-in-out infinite`,
        }}
      />
      <AnimatedOrb
        sx={{
          bottom: '-12%',
          left: '22%',
          width: { xs: 240, md: 360 },
          height: { xs: 240, md: 360 },
          background: `radial-gradient(circle, ${palette.c} 0%, transparent 70%)`,
          filter: 'blur(50px)',
          animation: `${floatC} 12s ease-in-out infinite`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(${palette.dot} 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
          opacity: 0.55,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: '-50%',
          background: palette.shimmer,
          backgroundSize: '200% 200%',
          opacity: 0.35,
          animation: `${shimmer} 16s ease infinite`,
        }}
      />
    </Box>
  );
}

const PALETTES = {
  patient: {
    a: 'rgba(21,101,192,0.24)',
    b: 'rgba(0,137,123,0.2)',
    c: 'rgba(66,165,245,0.18)',
    dot: alpha('#1565C0', 0.06),
    shimmer: 'linear-gradient(120deg, rgba(21,101,192,0.06), rgba(0,137,123,0.05), rgba(66,165,245,0.06), rgba(21,101,192,0.06))',
  },
  admin: {
    a: 'rgba(13,71,161,0.26)',
    b: 'rgba(21,101,192,0.18)',
    c: 'rgba(0,137,123,0.16)',
    dot: alpha('#0D47A1', 0.07),
    shimmer: 'linear-gradient(120deg, rgba(13,71,161,0.07), rgba(21,101,192,0.05), rgba(0,137,123,0.05), rgba(13,71,161,0.07))',
  },
};

export default function MaterialDecorBackground({ variant = 'shell' }) {
  if (variant === 'login-patient') {
    return <LoginBackground palette={PALETTES.patient} />;
  }

  if (variant === 'login-admin') {
    return <LoginBackground palette={PALETTES.admin} />;
  }

  if (variant === 'home') {
    return (
      <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <Box
          sx={{
            position: 'absolute',
            top: '8%',
            left: '-6%',
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(21,101,192,0.22) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '35%',
            right: '-8%',
            width: 380,
            height: 380,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,137,123,0.18) 0%, transparent 70%)',
            filter: 'blur(44px)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '-10%',
            left: '30%',
            width: 360,
            height: 360,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(66,165,245,0.16) 0%, transparent 70%)',
            filter: 'blur(48px)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(${alpha('#1565C0', 0.05)} 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
            opacity: 0.6,
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          left: -100,
          width: 360,
          height: 360,
          borderRadius: '50%',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
          filter: 'blur(80px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -120,
          right: -80,
          width: 400,
          height: 400,
          borderRadius: '50%',
          bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.08),
          filter: 'blur(90px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(${alpha('#102A43', 0.04)} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
    </Box>
  );
}
