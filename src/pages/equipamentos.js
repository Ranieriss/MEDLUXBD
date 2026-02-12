import { createEquipamento, deleteEquipamento, listEquipamentos, updateEquipamento } from '../api/equipamentos.js';
import { state } from '../state.js';
import { closeModal, confirmDialog, openModal, toast, escapeHtml } from '../ui.js';

function formEquipamento(item = {}) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <form>
      <div class="grid">
        <input name="codigo" placeholder="Código" value="${escapeHtml(item.codigo || '')}" required />
        <input name="nome" placeholder="Nome" value="${escapeHtml(item.nome || '')}" required />
        <input name="modelo" placeholder="Modelo" value="${escapeHtml(item.modelo || '')}" />
        <input name="status" placeholder="Status" value="${escapeHtml(item.status || 'ATIVO')}" />
      </div>
      <div class="row" style="margin-top:.7rem;"><button type="button" id="save-eq">Salvar</button></div>
    </form>`;
  return wrap;
}

export async function renderEquipamentos(view) {
  const items = await listEquipamentos();
  state.cache.equipamentos = items;
  let filtered = [...items];

  const draw = () => {
    view.innerHTML = `<div class="panel">
      <div class="row"><h2>Equipamentos</h2><input id="busca" placeholder="Buscar" /><button id="novo" class="small">Novo</button></div>
      <div class="table-wrap"><table><thead><tr><th>Código</th><th>Nome</th><th>Modelo</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>${filtered.map((i) => `<tr><td>${escapeHtml(i.codigo)}</td><td>${escapeHtml(i.nome)}</td><td>${escapeHtml(i.modelo || '')}</td><td>${escapeHtml(i.status || '')}</td><td class="row"><button class="small" data-edit="${i.id}">Editar</button><button class="small danger" data-del="${i.id}">Excluir</button></td></tr>`).join('') || '<tr><td colspan="5">Sem registros</td></tr>'}</tbody></table></div>
    </div>`;
    bind();
  };

  const bind = () => {
    view.querySelector('#busca').oninput = (e) => {
      const q = e.target.value.toLowerCase();
      filtered = items.filter((i) => `${i.codigo} ${i.nome} ${i.modelo || ''}`.toLowerCase().includes(q));
      draw();
      view.querySelector('#busca').value = q;
    };
    view.querySelector('#novo').onclick = () => showModal();
    view.querySelectorAll('[data-edit]').forEach((btn) => btn.onclick = () => showModal(items.find((i) => i.id === btn.dataset.edit)));
    view.querySelectorAll('[data-del]').forEach((btn) => btn.onclick = async () => {
      if (!confirmDialog('Excluir equipamento?')) return;
      await deleteEquipamento(btn.dataset.del);
      toast('Excluído');
      return renderEquipamentos(view);
    });
  };

  const showModal = (item = null) => {
    const form = formEquipamento(item || {});
    openModal(item ? 'Editar equipamento' : 'Novo equipamento', form);
    form.querySelector('#save-eq').onclick = async () => {
      const payload = Object.fromEntries(new FormData(form.querySelector('form')).entries());
      if (!payload.codigo || !payload.nome) return toast('Código e nome obrigatórios', 'error');
      if (item) await updateEquipamento(item.id, payload); else await createEquipamento(payload);
      closeModal();
      toast('Salvo com sucesso');
      renderEquipamentos(view);
    };
  };

  draw();
}
