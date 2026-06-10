import { Box } from '@mui/material';
import PortalMaterialShell from '../../../Components/material/PortalMaterialShell';
import AdminPortal from '../../AdminPortal';
import '../../../themes/material/adminPortalMaterial.css';

export default function AdminPortalMui() {
  return (
    <PortalMaterialShell
      portalLabel="Admin Console"
      fallbackPath="/admin-intro"
      avatarLetter="A"
      fullHeight
    >
      <Box
        className="admin-portal-material"
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: 'background.default',
          color: 'text.primary',
        }}
      >
        <AdminPortal />
      </Box>
    </PortalMaterialShell>
  );
}
