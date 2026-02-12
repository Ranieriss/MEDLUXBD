import { assertSupabaseConfig, supabase } from './supabaseClient.js';
import { handleRoute, navigate, registerRoute, setGuard } from './router.js';
import { addDiagnosticError, addEvent, setState, state, subscribe } from './state.js';
import { toast } from './ui.js';
import { getMyProfile, upsertProfile } from './api/profiles.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderEquipamentos } from './pages/equipamentos.js';
import { renderObras } from './pages/obras.js';
import { renderVinculos } from './pages/vinculos.js';
import { renderMedicoes } from './pages/medicoes.js';
import { renderAuditoria } from './pages/auditoria.js';

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
  if (!state.session) {
    sidebar.innerHTML = '';
    topbar.innerHTML = '';
    return;
  }

  sidebar.innerHTML = `<div class="brand"><span>⚕️</span> MEDLUXBD</div><nav class="nav">${links.map(([path, label]) => `<a href="#${path}" class="${window.location.hash === `#${path}` ? 'active' : ''}">${label}</a>`).join('')}</nav>`;
  topbar.innerHTML = `<div>Usuário: <b>${state.user?.email || '-'}</b> | Role: <b>${state.role}</b></div><div class="row"><button id="logout" class="secondary small">Sair</button></div>`;
  topbar.querySelector('#logout').onclick = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) addDiagnosticError(error, 'auth.logout');
    setState({ session: null, user: null, profile: null, role: 'USER' });
    addEvent({ type: 'logout', message: 'Logout realizado' });
    navigate('/login');
  };
}

async function loadProfile() {
  if (!state.user?.id) return;
  let profile = await getMyProfile(state.user.id);
  if (!profile) {
    profile = await upsertProfile({ id: state.user.id, role: 'USER', email: state.user.email });
  }
  setState({ profile, role: profile.role || 'USER' });
}

registerRoute('/login', renderLogin);
registerRoute('/dashboard', renderDashboard);
registerRoute('/equipamentos', renderEquipamentos);
registerRoute('/obras', renderObras);
registerRoute('/vinculos', renderVinculos);
registerRoute('/medicoes', renderMedicoes);
registerRoute('/auditoria', renderAuditoria);

setGuard(async (hash) => {
  const isLogin = hash === '/login';
  if (!state.session && !isLogin) return '/login';
  if (state.session && isLogin) return '/dashboard';
  return null;
});

subscribe(() => renderShell());

window.addEventListener('error', (ev) => {
  addDiagnosticError(ev.error || new Error(ev.message), 'window.error');
  toast(`Erro: ${ev.message}`, 'error');
});
window.addEventListener('unhandledrejection', (ev) => {
  addDiagnosticError(ev.reason, 'unhandledrejection');
  toast(`Falha não tratada: ${ev.reason?.message || ev.reason}`, 'error');
});

(async function boot() {
  try {
    assertSupabaseConfig();
    const { data } = await supabase.auth.getSession();
    setState({ session: data.session, user: data.session?.user || null });
    if (data.session?.user) await loadProfile();

    supabase.auth.onAuthStateChange(async (_event, session) => {
      setState({ session, user: session?.user || null });
      if (session?.user) await loadProfile();
      handleRoute();
    });

    renderShell();
    handleRoute();
  } catch (err) {
    addDiagnosticError(err, 'boot');
    toast(`Falha ao inicializar app: ${err.message}`, 'error');
  }
})();
