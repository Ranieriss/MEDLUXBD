export function getBasePath() {
  const path = window.location.pathname || '/';
  const normalizedPath = path.endsWith('/') ? path : `${path}/`;

  if (normalizedPath.includes('/MEDLUXBD/')) {
    return '/MEDLUXBD/';
  }

  return '/';
}

export function getAppBaseUrl() {
  return `${window.location.origin}${getBasePath()}`;
}
