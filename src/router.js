import { state } from './state.js';

const routes = new Map();
let beforeEach = null;

export function registerRoute(path, render) { routes.set(path, render); }
export function setGuard(fn) { beforeEach = fn; }

export function navigate(path) {
  if (window.location.hash !== `#${path}`) window.location.hash = `#${path}`;
  else handleRoute();
}

function resolveHashRoute() {
  const rawHash = window.location.hash.replace('#', '') || '/dashboard';
  const searchParams = new URLSearchParams(window.location.search);
  const hashLooksLikeRecoveryToken = rawHash.startsWith('access_token=') || rawHash.includes('type=recovery');
  const hasRecoveryCode = searchParams.has('code');

  if (hashLooksLikeRecoveryToken || hasRecoveryCode) {
    return '/update-password';
  }

  return rawHash.split('?')[0].split('#')[0];
}

export async function handleRoute() {
  const hash = resolveHashRoute();
  if (beforeEach) {
    const redirect = await beforeEach(hash, state);
    if (redirect && redirect !== hash) return navigate(redirect);
  }
  const view = document.getElementById('view');
  const render = routes.get(hash) || routes.get('/dashboard');
  if (render) await render(view);
}

window.addEventListener('hashchange', handleRoute);
