export function isAdminRoute(pathname, search = '') {
  const params = new URLSearchParams(search);
  const isAdminLogin =
    pathname === '/login' && params.get('role') === 'admin';

  return (
    pathname.startsWith('/admin') ||
    pathname === '/admin-intro' ||
    isAdminLogin
  );
}

export function isPatientRoute(pathname, search = '') {
  const params = new URLSearchParams(search);
  const isPatientLogin =
    pathname === '/login' && (params.get('role') || 'patient') === 'patient';

  return (
    pathname.startsWith('/patient') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/app') ||
    pathname.startsWith('/plans') ||
    pathname.startsWith('/checkout') ||
    isPatientLogin
  );
}

export function isMaterialRoute(pathname, search = '') {
  return (
    pathname === '/' ||
    isPatientRoute(pathname, search) ||
    isAdminRoute(pathname, search)
  );
}
