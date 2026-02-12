import { supabase } from '../supabaseClient.js';
import { addDiagnosticError, addEvent, setState } from '../state.js';
import { navigate } from '../router.js';
import { toast } from '../ui.js';

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
      </div>
    </div>`;

  const setErr = (e) => {
    const msg = `${e?.message || e}`;
    view.querySelector('#auth-error').textContent = msg;
    toast(msg, 'error');
  };

  view.querySelector('#btn-login').onclick = async () => {
    const email = view.querySelector('#email').value.trim();
    const password = view.querySelector('#senha').value;
    if (!email || !password) return setErr('Email e senha obrigatórios');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      addDiagnosticError(error, 'auth.login');
      return setErr(error);
    }
    setState({ session: data.session, user: data.user });
    addEvent({ type: 'login', message: `Login realizado: ${email}` });
    navigate('/dashboard');
  };

  view.querySelector('#btn-signup').onclick = async () => {
    const email = view.querySelector('#email').value.trim();
    const password = view.querySelector('#senha').value;
    if (!email || !password) return setErr('Email e senha obrigatórios');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      addDiagnosticError(error, 'auth.signup');
      return setErr(error);
    }
    toast('Conta criada. Verifique confirmação por email se habilitada.');
    addEvent({ type: 'signup', message: `Conta criada: ${email}` });
    if (data.session) navigate('/dashboard');
  };
}
