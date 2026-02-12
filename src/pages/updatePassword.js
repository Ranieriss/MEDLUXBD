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

function getHashTokenParams() {
  const hash = window.location.hash || '';
  const tokenPart = hash.includes('?') ? hash.split('?')[1] : '';
  return new URLSearchParams(tokenPart);
}

async function establishRecoverySession() {
  const url = new URL(window.location.href);
  const hashParams = getHashTokenParams();
  const code = url.searchParams.get('code') || hashParams.get('code');

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data?.session || null;
  }

  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');

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

    if (!recoverySession) {
      messageEl.textContent = 'Link inválido/expirado.';
      return;
    }

    setState({ session: recoverySession, user: recoverySession.user || null });
    messageEl.textContent = 'Link válido. Defina sua nova senha.';
    updateButton.disabled = false;
  } catch (error) {
    logSupabaseAuthError(error, 'auth.recoverySession');
    addDiagnosticError(error, 'auth.recoverySession');
    messageEl.textContent = 'Link inválido/expirado.';
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

      if (password !== confirmPassword) {
        return setErr('As senhas não conferem.');
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast('Senha atualizada com sucesso.');
      addEvent({ type: 'password.update', message: 'Senha atualizada via recovery' });
      navigate('/login');
    } catch (error) {
      logSupabaseAuthError(error, 'auth.updatePassword');
      addDiagnosticError(error, 'auth.updatePassword');
      setErr(error);
    }
  };
}
