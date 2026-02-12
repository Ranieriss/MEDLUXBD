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
import { toast } from '../ui.js';

function getCombinedRecoveryParams() {
  const url = new URL(window.location.href);
  const hash = window.location.hash || '';
  const hashParts = hash.split('#');
  const routeWithQuery = hashParts[0] || '';
  const hashQuery = routeWithQuery.includes('?') ? routeWithQuery.split('?')[1] : '';
  const hashFragment = hashParts.length > 1 ? hashParts.slice(1).join('#') : '';

  const combined = new URLSearchParams();
  const sources = [
    url.searchParams,
    new URLSearchParams(hashQuery),
    new URLSearchParams(hashFragment)
  ];

  for (const source of sources) {
    for (const [key, value] of source.entries()) {
      if (value && !combined.has(key)) combined.set(key, value);
    }
  }

  return combined;
}

async function establishRecoverySession() {
  const params = getCombinedRecoveryParams();
  const code = params.get('code');
  const recoveryType = params.get('type');

  if (code && recoveryType === 'recovery') {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data?.session || null;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (error) throw error;
    return data?.session || null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session || null;
}

function clearSensitiveRecoveryUrl() {
  const cleanUrl = `${window.location.origin}${window.location.pathname}#/update-password`;
  window.history.replaceState({}, '', cleanUrl);
}

export async function renderUpdatePassword(view) {
  view.innerHTML = `
    <div class="login-wrap">
      <div class="panel" style="max-width:440px;width:100%;">
        <h2>Atualizar senha</h2>
        <p class="muted" id="update-password-message">Validando link de recuperação...</p>
        <div id="auth-error" class="muted"></div>
        <div class="grid">
          <input id="new-password" type="password" placeholder="Nova senha" required />
          <input id="confirm-password" type="password" placeholder="Confirmar senha" required />
        </div>
        <div class="row" style="margin-top:.8rem;">
          <button id="btn-update-password">Salvar nova senha</button>
          <button id="btn-back-login" class="secondary">Voltar para login</button>
        </div>
      </div>
    </div>`;

  const messageEl = view.querySelector('#update-password-message');
  const errorEl = view.querySelector('#auth-error');
  const updateButton = view.querySelector('#btn-update-password');

  const setErr = (error) => {
    const msg = getSupabaseErrorMessage(error);
    errorEl.textContent = msg;
    toast(msg, 'error');
  };

  let recoverySession = null;
  updateButton.disabled = true;

  try {
    assertSupabaseConfig();
    recoverySession = await establishRecoverySession();
    clearSensitiveRecoveryUrl();

    if (!recoverySession) {
      messageEl.textContent = 'Link inválido/expirado. Solicite novo link.';
      return;
    }

    setState({ session: recoverySession, user: recoverySession.user || null });
    messageEl.textContent = 'Link válido. Defina sua nova senha.';
    updateButton.disabled = false;
  } catch (error) {
    logSupabaseAuthError(error, 'auth.recoverySession');
    addDiagnosticError(error, 'auth.recoverySession');
    messageEl.textContent = 'Link inválido/expirado. Solicite novo link.';
    setErr(error);
  }

  view.querySelector('#btn-back-login').onclick = () => navigate('/login');

  updateButton.onclick = async () => {
    try {
      const password = view.querySelector('#new-password').value;
      const confirmPassword = view.querySelector('#confirm-password').value;

      if (!password || !confirmPassword) {
        return setErr('Preencha os campos de senha.');
      }

      if (password.length < 8) {
        return setErr('A senha deve ter pelo menos 8 caracteres.');
      }

      if (password !== confirmPassword) {
        return setErr('As senhas não conferem.');
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      clearSensitiveRecoveryUrl();
      toast('Senha atualizada com sucesso. Faça login com a nova senha.');
      addEvent({ type: 'password.update', message: 'Senha atualizada via recovery' });
      await supabase.auth.signOut();
      setState({ session: null, user: null, profile: null, role: 'USER' });
      navigate('/login');
    } catch (error) {
      logSupabaseAuthError(error, 'auth.updatePassword');
      addDiagnosticError(error, 'auth.updatePassword');
      setErr(error);
    }
  };
}
