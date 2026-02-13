import { createEquipamento, deleteEquipamento, hasEquipamentoDependencies, listEquipamentos, updateEquipamento } from '../api/equipamentos.js';
import { state } from '../state.js';
import { closeModal, openModal, toast, escapeHtml } from '../ui.js';
import { validateEquipamento } from '../validators.js';
import { tryAuditLog } from '../audit.js';
import { createLogger } from '../logger.js';

const logger = createLogger('page.equipamentos');

function formEquipamento(item = {}) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <form>
      <div class="grid">
        <input name="codigo" placeholder="Código" value="${escapeHtml(item.codigo || '')}" required />
        <input name="nome" placeholder="Nome" value="${escapeHtml(item.nome || '')}" required />
        <input name="modelo" placeholder="Modelo" value="${escapeHtml(item.modelo || '')}" />
        <input name="tipo" placeholder="Tipo (OUTRO|LUXIMETRO...)" value="${escapeHtml(item.tipo || '')}" />
        <input name="status" placeholder="Status" value="${escapeHtml(item.status || 'ATIVO')}" />
      </div>
      <div class="row" style="margin-top:.7rem;"><button type="button" id="save-eq">Salvar</button></div>
    </form>`;
  return wrap;
}

export async function renderEquipamentos(view) {
  let showDeleted = view.dataset.showDeleted === 'true';
  let items = await listEquipamentos({ includeDeleted: showDeleted && state.role === 'ADMIN' });
  state.cache.equipamentos = items;
  let filtered = [...items];

  const visibleItems = () => filtered.filter((i) => showDeleted || !i.deleted_at);

  const draw = () => {
    view.innerHTML = `<div class="panel">
      <div class="row"><h2>Equipamentos</h2><input id="busca" placeholder="Buscar" /><button id="novo" class="small">Novo</button>${state.role === 'ADMIN' ? `<label class="muted"><input type="checkbox" id="toggle-deleted" ${showDeleted ? 'checked' : ''}/> Mostrar removidos</label>` : ''}</div>
      <div class="table-wrap"><table><thead><tr><th>Código</th><th>Nome</th><th>Modelo</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>${visibleItems().map((i) => `<tr><td>${escapeHtml(i.codigo || '-')}</td><td>${escapeHtml(i.nome || '-')}</td><td>${escapeHtml(i.modelo || '')}</td><td>${escapeHtml(i.status || '')}</td><td class="row"><button class="small" data-edit="${i.id}">Editar</button><button class="small danger" data-del="${i.id}">Inativar</button></td></tr>`).join('') || '<tr><td colspan="5">Sem registros</td></tr>'}</tbody></table></div>
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
    const toggle = view.querySelector('#toggle-deleted');
    if (toggle) {
      toggle.checked = showDeleted;
      toggle.onchange = async () => {
        showDeleted = toggle.checked;
        view.dataset.showDeleted = String(showDeleted);
        items = await listEquipamentos({ includeDeleted: showDeleted });
        filtered = [...items];
        draw();
      };
    }
    view.querySelector('#novo').onclick = () => showModal();
    view.querySelectorAll('[data-edit]').forEach((btn) => btn.onclick = () => showModal(items.find((i) => i.id === btn.dataset.edit)));
    view.querySelectorAll('[data-del]').forEach((btn) => btn.onclick = async () => {
      const typed = window.prompt('Confirmação forte: digite DELETE para inativar.');
      if (typed !== 'DELETE') return;
      if (await hasEquipamentoDependencies(btn.dataset.del)) return toast('Bloqueado: equipamento possui vínculos ou medições.', 'error');
      await deleteEquipamento(btn.dataset.del);
      await tryAuditLog({ action: 'DELETE', entity: 'equipamentos', entityId: btn.dataset.del, details: { mode: 'soft_delete' } });
      logger.warn('equipamento inativado', { id: btn.dataset.del });
      toast('Equipamento inativado');
      return renderEquipamentos(view);
    });
  };

  const showModal = (item = null) => {
    const form = formEquipamento(item || {});
    openModal(item ? 'Editar equipamento' : 'Novo equipamento', form);
    form.querySelector('#save-eq').onclick = async () => {
      const payload = Object.fromEntries(new FormData(form.querySelector('form')).entries());
      payload.status = String(payload.status || '').toUpperCase();
      payload.tipo = String(payload.tipo || '').toUpperCase();
      if (!payload.tipo) delete payload.tipo;
      const validationError = validateEquipamento(payload);
      if (validationError) {
        await tryAuditLog({ action: 'ERROR', entity: 'equipamentos.validation', severity: 'WARN', details: { message: validationError } });
        return toast(validationError, 'error');
      }
      const saved = item ? await updateEquipamento(item.id, payload) : await createEquipamento(payload);
      await tryAuditLog({ action: item ? 'UPDATE' : 'CREATE', entity: 'equipamentos', entityId: saved?.id || item?.id || null, details: { codigo: payload.codigo, status: payload.status }, before: item || null, after: saved || payload });
      closeModal();
      toast('Salvo com sucesso');
      renderEquipamentos(view);
    };
  };

  draw();
}
