import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ThemeProvider, useTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { patientMuiTheme, syncMuiCssVariables, clearMuiCssVariables } from './patientTheme';
import { adminMuiTheme, syncAdminMuiCssVariables } from './adminTheme';
import { isAdminRoute } from '../../utils/materialRoutes';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

function CssVariableSync({ isAdmin }) {
  const theme = useTheme();

  useLayoutEffect(() => {
    if (isAdmin) {
      syncAdminMuiCssVariables(theme);
    } else {
      syncMuiCssVariables(theme);
    }
    return () => clearMuiCssVariables();
  }, [theme, isAdmin]);

  return null;
}

export default function MaterialThemeProvider({ children, forceAdmin = false }) {
  const location = useLocation();
  const isAdmin = forceAdmin || isAdminRoute(location.pathname, location.search);
  const theme = isAdmin ? adminMuiTheme : patientMuiTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CssVariableSync isAdmin={isAdmin} />
      {children}
    </ThemeProvider>
  );
}
