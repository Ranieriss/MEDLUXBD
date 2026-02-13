import { createObra, deleteObra, listObras, updateObra } from '../api/obras.js';
import { state } from '../state.js';
import { closeModal, confirmDialog, openModal, toast, escapeHtml } from '../ui.js';
import { toFriendlyErrorMessage } from '../supabaseClient.js';

function obraForm(item = {}) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<form>
    <div class="grid">
      <input name="codigo" placeholder="Código" value="${escapeHtml(item.codigo || '')}" required />
      <input name="nome" placeholder="Nome" value="${escapeHtml(item.nome || '')}" required />
      <input name="local" placeholder="Local" value="${escapeHtml(item.local || '')}" />
      <input name="status" placeholder="Status" value="${escapeHtml(item.status || 'ATIVA')}" />
    </div>
    <div class="row" style="margin-top:.7rem;"><button type="button" id="save">Salvar</button></div>
  </form>`;
  return wrap;
}

export async function renderObras(view) {
  const items = await listObras();
  state.cache.obras = items;
  let filtered = [...items];

  const draw = () => {
    view.innerHTML = `<div class="panel"><div class="row"><h2>Obras</h2><input id="busca" placeholder="Buscar" /><button id="novo" class="small">Novo</button></div>
      <div class="table-wrap"><table><thead><tr><th>Código</th><th>Nome</th><th>Local</th><th>Status</th><th>Ações</th></tr></thead><tbody>
      ${filtered.map((i) => `<tr><td>${escapeHtml(i.codigo)}</td><td>${escapeHtml(i.nome)}</td><td>${escapeHtml(i.local || '')}</td><td>${escapeHtml(i.status || '')}</td><td class="row"><button class="small" data-edit="${i.id}">Editar</button><button class="small danger" data-del="${i.id}">Excluir</button></td></tr>`).join('') || '<tr><td colspan="5">Sem registros</td></tr>'}
      </tbody></table></div></div>`;
    bind();
  };

  const bind = () => {
    view.querySelector('#busca').oninput = (e) => { const q = e.target.value.toLowerCase(); filtered = items.filter((i) => `${i.codigo} ${i.nome} ${i.local || ''}`.toLowerCase().includes(q)); draw(); view.querySelector('#busca').value = q; };
    view.querySelector('#novo').onclick = () => showModal();
    view.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => showModal(items.find((x) => x.id === b.dataset.edit)));
    view.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { if (!confirmDialog('Excluir obra?')) return; try { await deleteObra(b.dataset.del); toast('Obra excluída'); renderObras(view); } catch (error) { toast(toFriendlyErrorMessage(error), 'error'); } });
  };

  const showModal = (item = null) => {
    const content = obraForm(item || {});
    openModal(item ? 'Editar obra' : 'Nova obra', content);
    content.querySelector('#save').onclick = async () => {
      const payload = Object.fromEntries(new FormData(content.querySelector('form')).entries());
      if (!payload.codigo || !payload.nome) return toast('Código e nome obrigatórios', 'error');
      try {
        if (item) await updateObra(item.id, payload); else await createObra(payload);
        closeModal();
        renderObras(view);
        toast('Salvo');
      } catch (error) {
        toast(toFriendlyErrorMessage(error), 'error');
      }
    };
  };
  draw();
}
