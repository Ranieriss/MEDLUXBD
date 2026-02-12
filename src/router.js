import { addDiagnosticError, state } from './state.js';
import { toast } from './ui.js';

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
  try {
    if (beforeEach) {
      const redirect = await beforeEach(hash, state);
      if (redirect && redirect !== hash) return navigate(redirect);
    }
    const view = document.getElementById('view');
    const render = routes.get(hash) || routes.get('/dashboard');
    if (render) await render(view);
  } catch (error) {
    addDiagnosticError(error, `router.handleRoute:${hash}`);
    toast(`Erro ao abrir a página: ${error?.message || error}`, 'error');
    const view = document.getElementById('view');
    if (view) {
      view.innerHTML = `<div class="panel"><h2>Falha ao carregar página</h2><p class="muted">${error?.message || 'Erro inesperado.'}</p><div class="row"><button id="go-dashboard" class="small">Ir para dashboard</button><button id="go-login" class="small secondary">Ir para login</button></div></div>`;
      const dashboardButton = view.querySelector('#go-dashboard');
      const loginButton = view.querySelector('#go-login');
      if (dashboardButton) dashboardButton.onclick = () => navigate('/dashboard');
      if (loginButton) loginButton.onclick = () => navigate('/login');
    }
  }
}

window.addEventListener('hashchange', handleRoute);
