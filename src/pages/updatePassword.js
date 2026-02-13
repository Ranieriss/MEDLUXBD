import {
  addDiagnosticError,
  addEvent,
  setState
} from '../state.js';
import {
  assertSupabaseConfig,
  getSupabaseErrorMessage,
  logSupabaseAuthError,
  supabase
} from '../supabaseClient.js';
import { navigate } from '../router.js';
import { fetchWithTimeout } from '../http.js';
import { toast } from '../ui.js';
import {
  cleanAuthParamsFromUrl,
  parseHashParams,
  parseQueryParams
} from '../auth/callback.js';

function getEmailPrefillFromUrl() {
  const query = parseQueryParams();
  const hash = parseHashParams();
  return query.get('email') || hash.get('email') || '';
}

async function navigateToLogin(email = '') {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    addDiagnosticError(error, 'auth.recovery.signOutToLogin');
  }

  setState({ session: null, user: null, profile: null, role: 'USER' });
  const emailQuery = email ? `?email=${encodeURIComponent(email)}` : '';
  navigate(`/login${emailQuery}`);
}

export async function renderUpdatePassword(view) {
  try {
    const template = await fetchWithTimeout('./src/pages/reset-password.html', {}, 8000);
    if (template.ok) view.innerHTML = await template.text();
  } catch (_) {
    // fallback below
  }

  if (!view.innerHTML.trim()) view.innerHTML = `
    <div class="login-wrap">
      <div class="panel" style="max-width:460px;width:100%;">
        <h2>Redefinir senha</h2>
        <p class="muted" id="update-password-message">Validando link de recuperação...</p>
        <div id="auth-error" class="muted"></div>
        <form id="update-password-form" class="grid" style="display:none;">
          <input id="new-password" type="password" placeholder="Nova senha" minlength="8" required />
          <input id="confirm-password" type="password" placeholder="Confirmar senha" minlength="8" required />
          <button id="btn-update-password" type="submit">Salvar nova senha</button>
        </form>
        <div class="row" style="margin-top:.8rem;" id="update-password-actions">
          <button id="btn-back-login" class="secondary" type="button">Voltar para login</button>
          <button id="btn-request-link" class="secondary" type="button" style="display:none;">Solicitar novo link</button>
        </div>
      </div>
    </div>`;

  const messageEl = view.querySelector('#update-password-message');
  const errorEl = view.querySelector('#auth-error');
  const formEl = view.querySelector('#update-password-form');
  const backButton = view.querySelector('#btn-back-login');
  const requestLinkButton = view.querySelector('#btn-request-link');
  const newPasswordEl = view.querySelector('#new-password');
  const confirmPasswordEl = view.querySelector('#confirm-password');
  const emailPrefill = getEmailPrefillFromUrl();

  const setErr = (error) => {
    const msg = getSupabaseErrorMessage(error);
    errorEl.textContent = msg;
    toast(msg, 'error');
  };

  const showInvalidLinkState = (friendlyMessage = 'Link inválido ou expirado. Clique em ‘Reenviar link’ na tela de login.') => {
    messageEl.textContent = friendlyMessage;
    formEl.style.display = 'none';
    requestLinkButton.style.display = 'inline-flex';
  };

  const showReadyState = () => {
    errorEl.textContent = '';
    messageEl.textContent = 'Link válido. Defina sua nova senha.';
    formEl.style.display = 'grid';
    requestLinkButton.style.display = 'none';
  };

  backButton.addEventListener('click', async () => navigateToLogin(emailPrefill));
  requestLinkButton.addEventListener('click', async () => navigateToLogin(emailPrefill));

  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      const newPassword = newPasswordEl.value;
      const confirmPassword = confirmPasswordEl.value;

      if (!newPassword || !confirmPassword) {
        return setErr('Preencha os campos de senha.');
      }

      if (newPassword.length < 8) {
        return setErr('A senha deve ter pelo menos 8 caracteres.');
      }

      if (newPassword !== confirmPassword) {
        return setErr('As senhas não conferem.');
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      await supabase.auth.signOut();
      setState({ session: null, user: null, profile: null, role: 'USER' });
      cleanAuthParamsFromUrl('/login');
      toast('Senha atualizada');
      addEvent({ type: 'password.update', message: 'Senha atualizada via recovery' });
      navigate('/login');
    } catch (error) {
      logSupabaseAuthError(error, 'auth.updatePassword');
      addDiagnosticError(error, 'auth.updatePassword');
      setErr(error);
    }
  });

  try {
    assertSupabaseConfig();
    const query = parseQueryParams();
    const hash = parseHashParams();
    const accessToken = hash.get('access_token') || query.get('access_token');
    const refreshToken = hash.get('refresh_token') || query.get('refresh_token');

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (error) throw error;
      cleanAuthParamsFromUrl('/update-password');
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const recoverySession = data?.session || null;
    if (!recoverySession) {
      showInvalidLinkState();
      return;
    }

    setState({ session: recoverySession, user: recoverySession.user || null });
    showReadyState();
  } catch (error) {
    logSupabaseAuthError(error, 'auth.recoverySession');
    addDiagnosticError(error, 'auth.recoverySession');
    showInvalidLinkState();
    setErr(error);
  }
}
