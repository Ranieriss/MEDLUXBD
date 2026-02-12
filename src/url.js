export function getAppBaseUrl() {
  const base = `${window.location.origin}${window.location.pathname.replace(/index\.html$/, '')}`;
  return base.endsWith('/') ? base : `${base}/`;
}
