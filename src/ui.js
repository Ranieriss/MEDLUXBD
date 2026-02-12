export function toast(message, type = 'info') {
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

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
