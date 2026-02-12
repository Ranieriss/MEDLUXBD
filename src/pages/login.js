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
import { getAppBaseUrl } from '../url.js';

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

  const setErr = (e) => {
    if (isEmailAuthDisabledError(e)) {
      const guidance = getEmailAuthDisabledGuidance();
      const detailed = getSupabaseErrorMessage(e);
      const modalContent = document.createElement('div');
      modalContent.innerHTML = `<p><strong>Login por email está desabilitado no Supabase.</strong></p><p>${detailed}</p><p>${guidance}</p>`;
      openModal('Configuração de autenticação necessária', modalContent);
      view.querySelector('#auth-error').textContent = detailed;
      toast(detailed, 'error');
      return;
    }

    const friendlyConfigMessage = mapSupabaseKeyErrorMessage(e);
    const msg = friendlyConfigMessage || getSupabaseErrorMessage(e);
    view.querySelector('#auth-error').textContent = msg;
    toast(msg, 'error');
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
        return setErr(error);
      }
      toast('Conta criada. Verifique confirmação por email se habilitada.');
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
      const redirectTo = `${getAppBaseUrl()}#/update-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        logSupabaseAuthError(error, 'auth.resetPassword');
        addDiagnosticError(error, 'auth.resetPassword');
        return setErr(error);
      }
      toast(`Link de recuperação enviado para ${email}.`);
    } catch (err) {
      logSupabaseAuthError(err, 'auth.resetPassword');
      addDiagnosticError(err, 'auth.resetPassword');
      setErr(err.message || err);
    }
  };
}
