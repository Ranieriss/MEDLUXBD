import { addDiagnosticError, state } from './state.js';
import { toFriendlyErrorMessage } from './supabaseClient.js';
import { toast } from './ui.js';

const routes = new Map();
let beforeEach = null;
let consumedInitialCodeParam = false;

export function registerRoute(path, render) { routes.set(path, render); }
export function setGuard(fn) { beforeEach = fn; }

export function navigate(path) {
  if (window.location.hash !== `#${path}`) window.location.hash = `#${path}`;
  else handleRoute();
}

export function renderError(message = 'Erro inesperado.') {
  const view = document.getElementById('view');
  if (!view) return;

  view.innerHTML = `<div class="panel"><h2>Falha ao carregar página</h2><p class="muted">${message}</p><div class="row"><button id="go-dashboard" class="small">Ir para dashboard</button><button id="go-login" class="small secondary">Ir para login</button></div></div>`;
  const dashboardButton = view.querySelector('#go-dashboard');
  const loginButton = view.querySelector('#go-login');
  if (dashboardButton) dashboardButton.onclick = () => navigate('/dashboard');
  if (loginButton) loginButton.onclick = () => navigate('/login');
}

export async function safeLoad(fn, context = 'router.safeLoad') {
  try {
    await fn();
    return true;
  } catch (e) {
    addDiagnosticError(e, context);
    const message = toFriendlyErrorMessage(e, 'Não foi possível carregar os dados desta página.');
    toast(message, 'error');
    renderError(message);
    return false;
  }
}

function resolveHashRoute() {
  const rawHash = window.location.hash.replace('#', '') || '/dashboard';
  const searchParams = new URLSearchParams(window.location.search);
  const hashRoute = rawHash.split('?')[0].split('#')[0] || '/dashboard';
  const hashLooksLikeRecoveryToken = rawHash.startsWith('access_token=') || rawHash.includes('type=recovery');
  const hasRecoveryCode = searchParams.has('code');

  if (hashRoute === '/update-password' || hashRoute === '/reset-password' || hashLooksLikeRecoveryToken) {
    return '/reset-password';
  }

  if (hasRecoveryCode && !consumedInitialCodeParam) {
    consumedInitialCodeParam = true;
    return '/reset-password';
  }

  return hashRoute;
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
    if (render) {
      await safeLoad(() => render(view), `router.handleRoute:${hash}`);
    }
  } catch (error) {
    addDiagnosticError(error, `router.handleRoute:${hash}`);
    const message = toFriendlyErrorMessage(error, 'Erro ao abrir a página.');
    toast(message, 'error');
    renderError(message);
  }
}

window.addEventListener('hashchange', handleRoute);
