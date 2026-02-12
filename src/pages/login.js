import {
  assertSupabaseConfig,
  getEmailAuthDisabledGuidance,
  getSupabaseErrorMessage,
  isEmailAuthDisabledError,
  logSupabaseAuthError,
  supabase
} from '../supabaseClient.js';
import { mapSupabaseKeyErrorMessage } from '../config.js';
import { addDiagnosticError, addEvent, setState } from '../state.js';
import { navigate } from '../router.js';
import { openModal, toast } from '../ui.js';

function getRedirectToUpdatePassword() {
  const base = window.location.origin + window.location.pathname.replace(/index\.html$/, '');
  return `${base}#/update-password`;
}

function isInvalidCredentialsError(error) {
  return Number(error?.status) === 400
    && String(error?.message || '').toLowerCase().includes('invalid login credentials');
}

function isUserAlreadyRegisteredError(error) {
  const status = Number(error?.status);
  const message = String(error?.message || '').toLowerCase();
  return status === 422 || message.includes('user already registered');
}

export async function renderLogin(view) {
  view.innerHTML = `
    <div class="login-wrap">
      <div class="panel" style="max-width:440px;width:100%;">
        <h2>MEDLUXBD Login</h2>
        <p class="muted">Use email/senha para entrar ou criar conta.</p>
        <div id="auth-error" class="muted"></div>
        <div class="grid">
          <input id="email" type="email" placeholder="email" required />
          <input id="senha" type="password" placeholder="senha" required />
        </div>
        <div class="row" style="margin-top:.8rem;">
          <button id="btn-login">Entrar</button>
          <button id="btn-signup" class="secondary">Criar conta</button>
        </div>
        <div class="row" style="margin-top:.8rem;">
          <button id="btn-forgot" class="secondary">Esqueci minha senha</button>
        </div>
      </div>
    </div>`;

  const errorEl = view.querySelector('#auth-error');

  const setErr = (e) => {
    if (isEmailAuthDisabledError(e)) {
      const guidance = getEmailAuthDisabledGuidance();
      const detailed = getSupabaseErrorMessage(e);
      const modalContent = document.createElement('div');
      modalContent.innerHTML = `<p><strong>Login por email está desabilitado no Supabase.</strong></p><p>${detailed}</p><p>${guidance}</p>`;
      openModal('Configuração de autenticação necessária', modalContent);
      errorEl.textContent = detailed;
      toast(detailed, 'error');
      return;
    }

    const friendlyConfigMessage = mapSupabaseKeyErrorMessage(e);
    const msg = friendlyConfigMessage || getSupabaseErrorMessage(e);
    errorEl.textContent = msg;
    toast(msg, 'error');
  };

  const setInfo = (message) => {
    errorEl.textContent = message;
    toast(message);
  };

  try {
    assertSupabaseConfig();
  } catch (err) {
    setErr(err);
  }

  view.querySelector('#btn-login').onclick = async () => {
    try {
      assertSupabaseConfig();
      const email = view.querySelector('#email').value.trim();
      const password = view.querySelector('#senha').value;
      if (!email || !password) return setErr('Email e senha obrigatórios');

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        logSupabaseAuthError(error, 'auth.login');
        addDiagnosticError(error, 'auth.login');

        if (isInvalidCredentialsError(error)) {
          return setErr('E-mail ou senha inválidos.');
        }

        return setErr(error);
      }

      setState({ session: data.session, user: data.user });
      addEvent({ type: 'login', message: `Login realizado: ${email}` });
      navigate('/dashboard');
    } catch (err) {
      logSupabaseAuthError(err, 'auth.login');
      addDiagnosticError(err, 'auth.login');
      setErr(err.message || err);
    }
  };

  view.querySelector('#btn-signup').onclick = async () => {
    try {
      assertSupabaseConfig();
      const email = view.querySelector('#email').value.trim();
      const password = view.querySelector('#senha').value;
      if (!email || !password) return setErr('Email e senha obrigatórios');

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        logSupabaseAuthError(error, 'auth.signup');
        addDiagnosticError(error, 'auth.signup');

        if (isUserAlreadyRegisteredError(error)) {
          return setInfo('Usuário já cadastrado. Use Entrar ou Esqueci minha senha.');
        }

        return setErr(error);
      }

      setInfo('Conta criada. Verifique seu e-mail para confirmar cadastro, se necessário.');
      addEvent({ type: 'signup', message: `Conta criada: ${email}` });
      if (data.session) navigate('/dashboard');
    } catch (err) {
      logSupabaseAuthError(err, 'auth.signup');
      addDiagnosticError(err, 'auth.signup');
      setErr(err.message || err);
    }
  };

  view.querySelector('#btn-forgot').onclick = async () => {
    try {
      assertSupabaseConfig();
      const email = view.querySelector('#email').value.trim() || window.prompt('Digite seu email para reset de senha:');
      if (!email) return setErr('Email é obrigatório para recuperar senha');

      const redirectTo = getRedirectToUpdatePassword();
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        logSupabaseAuthError(error, 'auth.resetPassword');
        addDiagnosticError(error, 'auth.resetPassword');
        return setErr(error);
      }

      setInfo('Link enviado para o e-mail.');
    } catch (err) {
      logSupabaseAuthError(err, 'auth.resetPassword');
      addDiagnosticError(err, 'auth.resetPassword');
      setErr(err.message || err);
    }
  };
}
