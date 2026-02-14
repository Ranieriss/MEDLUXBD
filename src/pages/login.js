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
import { getBasePath } from '../url.js';
import { ensureOrgContext } from '../auth/orgContext.js';

let authActionInFlight = false;

function getRedirectToUpdatePassword() {
  return `${window.location.origin}${getBasePath()}#/update-password`;
}

async function tryAutoLoginAfterSignupConflict(email, password, setInfo) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (isInvalidCredentialsError(error)) {
      setInfo('Este e-mail já está cadastrado. Se não lembrar a senha, use “Esqueci minha senha”.');
      return;
    }
    throw error;
  }

  await ensureOrgContext(data.user);
  setState({ session: data.session, user: data.user });
  addEvent({ type: 'login', message: `Login automático após cadastro: ${email}` });
  toast('Conta já existia; login realizado com sucesso.');
  navigate('/dashboard');
}

function parseLoginParams() {
  const url = new URL(window.location.href);
  const hash = (window.location.hash || '').replace(/^#/, '');
  const hashQuery = hash.includes('?') ? hash.split('?').slice(1).join('?') : '';
  const hashParams = new URLSearchParams(hashQuery);
  return {
    email: url.searchParams.get('email') || hashParams.get('email') || ''
  };
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

function withAuthActionLock(action) {
  return async (...args) => {
    if (authActionInFlight) return;
    authActionInFlight = true;
    try {
      await action(...args);
    } finally {
      authActionInFlight = false;
    }
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toOrgContextFriendlyMessage(error) {
  const rawMessage = String(error?.message || '').toLowerCase();
  if (rawMessage.includes('não está vinculado a uma organização') || rawMessage.includes('organization_id')) {
    return 'Sua conta ainda não está vinculada a uma organização. Fale com o administrador para liberar seu acesso.';
  }
  return 'Não foi possível preparar seu acesso à organização agora. Tente novamente em instantes.';
}

export async function renderLogin(view) {
  view.innerHTML = `
    <div class="login-wrap">
      <div class="panel" style="max-width:440px;width:100%;">
        <h2>MEDLUXBD Login</h2>
        <p class="muted">Use email/senha para entrar ou criar conta.</p>
        <div id="auth-error" class="muted"></div>
        <form id="login-form" class="grid">
          <input id="email" type="email" placeholder="email" required />
          <input id="senha" type="password" placeholder="senha" required />
          <button id="btn-login" type="submit">Entrar</button>
        </form>
        <div class="row" style="margin-top:.8rem;">
          <button id="btn-signup" class="secondary" type="button">Criar conta</button>
          <button id="btn-forgot" class="secondary" type="button">Esqueci minha senha</button>
        </div>
      </div>
    </div>`;

  const errorEl = view.querySelector('#auth-error');
  const formEl = view.querySelector('#login-form');
  const emailEl = view.querySelector('#email');
  const passwordEl = view.querySelector('#senha');
  const { email: emailFromUrl } = parseLoginParams();

  if (emailFromUrl) {
    emailEl.value = emailFromUrl;
    emailEl.focus();
  }

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

  formEl.addEventListener('submit', withAuthActionLock(async (event) => {
    event.preventDefault();

    try {
      assertSupabaseConfig();
      const email = emailEl.value.trim();
      const password = passwordEl.value;
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

      try {
        await ensureOrgContext(data.user);
      } catch (orgError) {
        logSupabaseAuthError(orgError, 'auth.login.orgContext');
        addDiagnosticError(orgError, 'auth.login.orgContext');
        await supabase.auth.signOut();
        return setErr(toOrgContextFriendlyMessage(orgError));
      }

      setState({ session: data.session, user: data.user });
      addEvent({ type: 'login', message: `Login realizado: ${email}` });
      navigate('/dashboard');
    } catch (err) {
      logSupabaseAuthError(err, 'auth.login');
      addDiagnosticError(err, 'auth.login');
      setErr(err.message || err);
    }
  }));

  view.querySelector('#btn-signup').addEventListener('click', withAuthActionLock(async () => {
    try {
      assertSupabaseConfig();
      const email = emailEl.value.trim();
      const password = passwordEl.value;
      if (!email || !password) return setErr('Email e senha obrigatórios');

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        logSupabaseAuthError(error, 'auth.signup');
        addDiagnosticError(error, 'auth.signup');

        if (isUserAlreadyRegisteredError(error)) {
          await tryAutoLoginAfterSignupConflict(email, password, setInfo);
          return;
        }

        return setErr(error);
      }

      setInfo('Conta criada. Verifique seu e-mail para confirmar cadastro, se necessário.');
      addEvent({ type: 'signup', message: `Conta criada: ${email}` });
      if (data.session) {
        await ensureOrgContext(data.user);
        navigate('/dashboard');
      }
    } catch (err) {
      logSupabaseAuthError(err, 'auth.signup');
      addDiagnosticError(err, 'auth.signup');
      setErr(err.message || err);
    }
  }));

  view.querySelector('#btn-forgot').addEventListener('click', withAuthActionLock(async () => {
    try {
      assertSupabaseConfig();
      const email = emailEl.value.trim();
      if (!email) return setErr('Informe seu e-mail para recuperar senha.');
      if (!isValidEmail(email)) return setErr('Informe um e-mail válido para recuperar senha.');

      const redirectTo = `${getRedirectToUpdatePassword()}?email=${encodeURIComponent(email)}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        logSupabaseAuthError(error, 'auth.resetPassword');
        addDiagnosticError(error, 'auth.resetPassword');
        return setErr(error);
      }

      setInfo('Se existir uma conta para este e-mail, enviamos o link de recuperação. Verifique sua caixa de entrada.');
    } catch (err) {
      logSupabaseAuthError(err, 'auth.resetPassword');
      addDiagnosticError(err, 'auth.resetPassword');
      setErr(err.message || err);
    }
  }));
}
