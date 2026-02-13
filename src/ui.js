import { nowUnixMs } from './shared_datetime.js';

const TOAST_DEDUPE_WINDOW_MS = 1800;
let lastToastMessage = '';
let lastToastAt = 0;

export function toast(message, type = 'info') {
  const now = nowUnixMs();
  if (message === lastToastMessage && now - lastToastAt < TOAST_DEDUPE_WINDOW_MS) {
    return;
  }

  lastToastMessage = message;
  lastToastAt = now;

  const container = document.getElementById('toast-container');
  const div = document.createElement('div');
  div.className = `toast ${type === 'error' ? 'error' : ''}`;
  div.textContent = message;
  container.appendChild(div);
  setTimeout(() => div.remove(), 4500);
}

export function setLoading(el, loading) {
  el.dataset.loading = String(loading);
  el.style.opacity = loading ? '.65' : '1';
}

export function openModal(title, content, onClose) {
  const root = document.getElementById('modal-root');
  root.classList.add('open');
  root.innerHTML = `<div class="modal"><h3>${title}</h3><div id="modal-content"></div><div class="row"><button class="secondary" id="close-modal">Fechar</button></div></div>`;
  root.querySelector('#modal-content').append(content);
  root.querySelector('#close-modal').onclick = () => closeModal(onClose);
}

export function closeModal(onClose) {
  const root = document.getElementById('modal-root');
  root.classList.remove('open');
  root.innerHTML = '';
  if (onClose) onClose();
}

export function confirmDialog(msg) {
  return window.confirm(msg);
}

export function confirmDestructiveModal(message, confirmationWord = 'EXCLUIR') {
  return new Promise((resolve) => {
    const body = document.createElement('div');
    body.innerHTML = `<p>${escapeHtml(message)}</p><input id="confirm-word" placeholder="Digite ${confirmationWord}" /><div class="row" style="margin-top:.7rem;"><button id="confirm-ok" class="danger">Confirmar</button><button id="confirm-cancel" class="secondary">Cancelar</button></div>`;
    openModal('Confirmação de segurança', body, () => resolve(false));
    body.querySelector('#confirm-cancel').onclick = () => {
      closeModal();
      resolve(false);
    };
    body.querySelector('#confirm-ok').onclick = () => {
      const typed = body.querySelector('#confirm-word').value;
      const ok = typed === confirmationWord;
      if (!ok) return toast(`Digite ${confirmationWord} para continuar.`, 'error');
      closeModal();
      resolve(true);
    };
  });
}

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
