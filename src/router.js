import { addDiagnosticError, state } from './state.js';
import { supabase, toFriendlyErrorMessage } from './supabaseClient.js';
import { handleGlobalError } from './errorHandling.js';

const routes = new Map();
let beforeEach = null;
let consumedInitialCodeParam = false;

export function registerRoute(path, render) { routes.set(path, render); }
export function setGuard(fn) { beforeEach = fn; }

export function navigate(path) {
  if (window.location.hash !== `#${path}`) window.location.hash = `#${path}`;
  else handleRoute();
}

export function renderError(message = 'Erro inesperado.', technical = null) {
  const view = document.getElementById('view');
  if (!view) return;

  const adminDetails = state.role === 'ADMIN' && technical
    ? `<details class="error-details"><summary>Detalhes técnicos</summary><pre>${JSON.stringify(technical, null, 2)}</pre></details>`
    : '';

  view.innerHTML = `<div class="panel"><h2>Falha ao carregar página</h2><p class="muted">${message}</p><div class="row"><button id="reload-page" class="small">Recarregar</button><button id="go-dashboard" class="small secondary">Voltar ao Dashboard</button></div>${adminDetails}</div>`;
  const dashboardButton = view.querySelector('#go-dashboard');
  const reloadButton = view.querySelector('#reload-page');
  if (dashboardButton) dashboardButton.onclick = () => navigate('/dashboard');
  if (reloadButton) reloadButton.onclick = () => window.location.reload();
}

export async function safeLoad(fn, context = 'router.safeLoad') {
  try {
    await fn();
    return true;
  } catch (e) {
    addDiagnosticError(e, context);
    const message = toFriendlyErrorMessage(e, 'Não foi possível carregar os dados desta página.');
    await handleGlobalError(e, context);
    renderError(message, { context, endpoint: e?.url || null, status: e?.status || null, message: e?.message || String(e) });
    return false;
  }
}

function hasRecoveryIndicators({ hashValue, searchValue, hashRoute, searchParams }) {
  const hashHasRecoveryType = hashValue.includes('type=recovery');
  const hashHasAccessToken = hashValue.includes('access_token=');
  const searchHasRecoveryType = searchValue.includes('type=recovery');
  const hasCode = searchParams.has('code');
  const routeSuggestsRecovery = hashRoute === '/update-password' || hashRoute === '/reset-password';
  const codeWithRecoveryHint = hasCode && (searchHasRecoveryType || hashHasRecoveryType || routeSuggestsRecovery);

  return {
    isRecovery: hashHasRecoveryType || hashHasAccessToken || searchHasRecoveryType || codeWithRecoveryHint,
    hasCode
  };
}

async function resolveHashRoute() {
  const rawHash = window.location.hash.replace('#', '') || '/dashboard';
  const rawSearch = window.location.search || '';
  const searchParams = new URLSearchParams(window.location.search);
  const hashRoute = rawHash.split('?')[0].split('#')[0] || '/dashboard';
  const { isRecovery, hasCode } = hasRecoveryIndicators({
    hashValue: rawHash,
    searchValue: rawSearch,
    hashRoute,
    searchParams
  });

  if (hasCode && !consumedInitialCodeParam) {
    consumedInitialCodeParam = true;
    const code = searchParams.get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    }
    return isRecovery ? '/update-password' : '/dashboard';
  }

  if (isRecovery || hashRoute === '/update-password' || hashRoute === '/reset-password') {
    return '/update-password';
  }

  return hashRoute;
}

export async function handleRoute() {
  const hash = await resolveHashRoute();
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
    await handleGlobalError(error, `router.handleRoute:${hash}`);
    renderError(message, { endpoint: error?.url || null, status: error?.status || null, message: error?.message || String(error) });
  }
}

window.addEventListener('hashchange', handleRoute);
