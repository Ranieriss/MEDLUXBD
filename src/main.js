import { assertSupabaseConfig, handleAppError, supabase } from './supabaseClient.js';
import { handleRoute, navigate, registerRoute, setGuard } from './router.js';
import { addDiagnosticError, addEvent, setState, state, subscribe } from './state.js';
import { ensureProfileShape, getMyProfile, upsertProfile } from './api/profiles.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderEquipamentos } from './pages/equipamentos.js';
import { renderObras } from './pages/obras.js';
import { renderVinculos } from './pages/vinculos.js';
import { renderMedicoes } from './pages/medicoes.js';
import { renderAuditoria } from './pages/auditoria.js';
import { renderUpdatePassword } from './pages/updatePassword.js';
import { cleanAuthParamsFromUrl, hasRecoveryParams } from './auth/callback.js';
import { APP_VERSION } from './version.js';
import { createLogger } from './logger.js';
import { handleGlobalError } from './errorHandling.js';
import { ensureOrgContext, resetOrgContext } from './auth/orgContext.js';
import { toast } from './ui.js';

const appLogger = createLogger('app');
const links = [
  ['/dashboard', 'Dashboard'],
  ['/equipamentos', 'Equipamentos'],
  ['/obras', 'Obras'],
  ['/vinculos', 'Vínculos'],
  ['/medicoes', 'Medições'],
  ['/auditoria', 'Auditoria']
];

function renderShell() {
  const sidebar = document.getElementById('sidebar');
  const topbar = document.getElementById('topbar');
  const footerVersion = document.getElementById('app-version');
  if (footerVersion) footerVersion.textContent = `v${APP_VERSION}`;
  if (!state.session) {
    sidebar.innerHTML = '';
    topbar.innerHTML = '';
    return;
  }

  sidebar.innerHTML = `<div class="brand"><span>⚕️</span> MEDLUXBD</div><nav class="nav">${links.map(([path, label]) => `<a href="#${path}" class="${window.location.hash === `#${path}` ? 'active' : ''}">${label}</a>`).join('')}</nav><p class="muted">Versão v${APP_VERSION}</p>`;
  topbar.innerHTML = `<div>Usuário: <b>${state.user?.email || '-'}</b> | Role: <b>${state.role}</b></div><div class="row"><button id="logout" class="secondary small">Sair</button></div>`;
  topbar.querySelector('#logout').onclick = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) addDiagnosticError(error, 'auth.logout');
    resetOrgContext();
    setState({ session: null, user: null, profile: null, role: 'USER' });
    addEvent({ type: 'logout', message: 'Logout realizado' });
    navigate('/login');
  };
}

function isMissingOrganizationError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('não está vinculado a uma organização') || message.includes('organization_id');
}

function notifyOrgContextError(error) {
  const message = isMissingOrganizationError(error)
    ? 'Seu usuário não está vinculado a uma organização. Faça login novamente após a configuração do seu acesso.'
    : 'Não foi possível preparar o contexto da organização. Faça login novamente para tentar de novo.';
  toast(message, 'error');
}

async function loadProfile() {
  if (!state.user?.id) return;
  let profile = await getMyProfile(state.user.id);
  if (!profile) {
    profile = await upsertProfile({
      id: state.user.id,
      role: 'USER',
      email: state.user.email,
      nome: (state.user.email || '').split('@')[0] || 'Usuário'
    });
  }

  const completeProfile = ensureProfileShape(profile, {
    id: state.user.id,
    email: state.user.email,
    role: 'USER'
  });

  if (!profile?.nome || !profile?.email || !profile?.role) {
    await upsertProfile(completeProfile);
  }

  setState({
    profile: completeProfile,
    role: completeProfile.role || 'USER'
  });
}

registerRoute('/login', renderLogin);
registerRoute('/dashboard', renderDashboard);
registerRoute('/equipamentos', renderEquipamentos);
registerRoute('/obras', renderObras);
registerRoute('/vinculos', renderVinculos);
registerRoute('/medicoes', renderMedicoes);
registerRoute('/auditoria', renderAuditoria);
registerRoute('/update-password', renderUpdatePassword);
registerRoute('/reset-password', renderUpdatePassword);

setGuard(async (hash) => {
  const isLogin = hash === '/login';
  const isRecovery = hash === '/update-password' || hash === '/reset-password';
  if (!state.session && !isLogin && !isRecovery) return '/login';
  if (state.session && !isLogin && !isRecovery) {
    try {
      await ensureOrgContext(state.user);
    } catch (error) {
      addDiagnosticError(error, 'router.guard.ensureOrgContext');
      notifyOrgContextError(error);
      await supabase.auth.signOut();
      resetOrgContext();
      setState({ session: null, user: null, profile: null, role: 'USER' });
      return '/login';
    }
  }
  if (state.session && isLogin) return '/dashboard';
  return null;
});

subscribe(() => renderShell());

window.addEventListener('error', (ev) => {
  appLogger.error('window.error', {
    action: 'window.error',
    entity: 'app',
    details: {
      message: ev.message,
      source: ev.filename,
      line: ev.lineno,
      col: ev.colno
    }
  });
  handleGlobalError(ev.error || new Error(ev.message), 'window.error');
});

window.addEventListener('unhandledrejection', (ev) => {
  appLogger.error('unhandledrejection', {
    action: 'window.unhandledrejection',
    entity: 'app',
    details: {
      reason: ev.reason?.message || String(ev.reason)
    }
  });
  handleGlobalError(ev.reason || new Error('Falha não tratada'), 'window.unhandledrejection');
});

(async function boot() {
  try {
    assertSupabaseConfig();

    const { data } = await supabase.auth.getSession();
    let bootSession = data.session || null;

    if (bootSession?.user) {
      try {
        await ensureOrgContext(bootSession.user);
      } catch (error) {
        addDiagnosticError(error, 'boot.ensureOrgContext');
        notifyOrgContextError(error);
        await supabase.auth.signOut();
        resetOrgContext();
        bootSession = null;
      }
    }

    setState({ session: bootSession, user: bootSession?.user || null });
    if (bootSession?.user) await loadProfile();

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/update-password');
        cleanAuthParamsFromUrl('/update-password');
        return;
      }

      if (event === 'SIGNED_OUT') {
        resetOrgContext();
      }

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        try {
          await ensureOrgContext(session.user);
        } catch (error) {
          addDiagnosticError(error, `auth.onAuthStateChange.${event}.ensureOrgContext`);
          notifyOrgContextError(error);
          await supabase.auth.signOut();
          resetOrgContext();
          setState({ session: null, user: null, profile: null, role: 'USER' });
          navigate('/login');
          return;
        }
      }

      if (!session?.user) {
        resetOrgContext();
      }

      setState({ session, user: session?.user || null });
      if (session?.user) await loadProfile();
      if (hasRecoveryParams()) cleanAuthParamsFromUrl(window.location.hash.replace('#', '') || '/dashboard');
      handleRoute();
    });

    renderShell();
    handleRoute();
  } catch (err) {
    appLogger.error('boot failed', { action: 'boot', entity: 'app', details: { message: err?.message } });
    await handleGlobalError(err, 'boot');
  }
})();
