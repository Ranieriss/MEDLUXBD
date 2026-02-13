import { createVinculo, deleteVinculo, encerrarVinculo, getVinculoFileUrl, hasActiveVinculoByEquipamento, listVinculos, updateVinculo } from '../api/vinculos.js';
import { listEquipamentos } from '../api/equipamentos.js';
import { listObras } from '../api/obras.js';
import { uploadTermo } from '../api/storage.js';
import { state } from '../state.js';
import { closeModal, openModal, toast, escapeHtml, confirmDestructiveModal } from '../ui.js';
import { toFriendlyErrorMessage } from '../supabaseClient.js';
import { formatLocalBrSafe, localInputToUtcIso, toInputDateTimeLocal, daysSinceIso } from '../shared_datetime.js';
import { validateVinculo } from '../validators.js';
import { tryAuditLog } from '../audit.js';

const getEntregaBase = (item) => item.inicio_em || item.created_at;
const daysWithUser = (date) => { const days = daysSinceIso(date); return days === null ? '-' : days; };

function vinculoForm({ item = {}, equipamentos = [], obras = [] }) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<form>
    <div class="grid">
      <select name="equipamento_id" required><option value="">Equipamento</option>${equipamentos.map((e) => `<option value="${e.id}" ${item.equipamento_id === e.id ? 'selected' : ''}>${escapeHtml(e.codigo)} - ${escapeHtml(e.nome || '')}</option>`).join('')}</select>
      <select name="obra_id"><option value="">Obra</option>${obras.map((o) => `<option value="${o.id}" ${item.obra_id === o.id ? 'selected' : ''}>${escapeHtml(o.codigo)} - ${escapeHtml(o.nome || '')}</option>`).join('')}</select>
      <input name="user_id" placeholder="user_id" value="${escapeHtml(item.user_id || state.user.id)}" required />
      <input type="datetime-local" name="inicio_em" value="${escapeHtml(toInputDateTimeLocal(item.inicio_em || ''))}" required />
      <input name="status" placeholder="Status" value="${escapeHtml(item.status || 'ATIVO')}" />
      <input type="file" name="termo" />
    </div>
    <div class="row" style="margin-top:.7rem;"><button type="button" id="save-v">Salvar</button></div>
  </form>`;
  return wrap;
}

export async function renderVinculos(view) {
  const [items, equipamentos, obras] = await Promise.all([listVinculos(), listEquipamentos(), listObras()]);
  state.cache.vinculos = items;

  const eqMap = Object.fromEntries(equipamentos.map((e) => [e.id, e]));
  const obMap = Object.fromEntries(obras.map((o) => [o.id, o]));

  view.innerHTML = `<div class="panel"><div class="row"><h2>Vínculos</h2><button id="novo" class="small">Novo</button></div>
    <div class="table-wrap"><table><thead><tr><th>Equipamento</th><th>Obra</th><th>User</th><th>Entrega</th><th>Dias c/ usuário</th><th>Termo</th><th>Ações</th></tr></thead><tbody>
    ${items.map((i) => {
      const entrega = getEntregaBase(i);
      return `<tr>
      <td>${escapeHtml(i.equipamento?.codigo || eqMap[i.equipamento_id]?.codigo || i.equipamento_id)}</td>
      <td>${escapeHtml(i.obra?.codigo || obMap[i.obra_id]?.codigo || i.obra_id || '-')}</td>
      <td>${escapeHtml(i.user_id)}</td>
      <td>${escapeHtml(formatLocalBrSafe(entrega || ''))}</td>
      <td>${daysWithUser(entrega)}</td>
      <td>${i.termo_url ? `<button class='small secondary' data-arq='${i.id}'>Abrir</button>` : '-'}</td>
      <td class="row"><button class="small" data-edit="${i.id}">Editar</button><button class="small" data-end="${i.id}">Encerrar</button><button class="small danger" data-del="${i.id}">Excluir</button></td>
    </tr>`;
    }).join('') || '<tr><td colspan="7">Sem vínculos</td></tr>'}
    </tbody></table></div></div>`;

  const openEditor = (item = null) => {
    const content = vinculoForm({ item: item || {}, equipamentos, obras });
    openModal(item ? 'Editar vínculo' : 'Novo vínculo', content);
    content.querySelector('#save-v').onclick = async () => {
      try {
        const form = content.querySelector('form');
        const fd = new FormData(form);
        const payload = Object.fromEntries(fd.entries());
        payload.status = String(payload.status || '').toUpperCase();
        payload.inicio_em = localInputToUtcIso(payload.inicio_em);
        const validationError = validateVinculo(payload);
        if (validationError) {
          await tryAuditLog({ action: 'ERROR', entity: 'vinculos.validation', severity: 'WARN', details: { message: validationError } });
          return toast(validationError, 'error');
        }
        if (!item && await hasActiveVinculoByEquipamento(payload.equipamento_id)) {
          return toast('Já existe vínculo ATIVO para este equipamento.', 'error');
        }
        if (!payload.obra_id) delete payload.obra_id;
        const file = form.querySelector('input[name="termo"]').files[0];
        if (file) {
          const obraCodigo = (obras.find((o) => o.id === payload.obra_id)?.codigo || 'obra').toString();
          const equipamentoCodigo = (equipamentos.find((e) => e.id === payload.equipamento_id)?.codigo || 'equip').toString();
          payload.termo_url = await uploadTermo({ file, obraCodigo, equipamentoCodigo });
          payload.termo_nome = file.name;
        }
        delete payload.termo;
        if (item) await updateVinculo(item.id, payload); else await createVinculo(payload);
        await tryAuditLog({ action: item ? 'UPDATE' : 'CREATE', entity: 'vinculos', entityId: item?.id || null, before: item, after: payload, details: { equipamento_id: payload.equipamento_id, status: payload.status } });
        closeModal();
        toast('Vínculo salvo');
        renderVinculos(view);
      } catch (error) {
        toast(toFriendlyErrorMessage(error), 'error');
      }
    };
  };

  view.querySelector('#novo').onclick = () => openEditor();
  view.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => openEditor(items.find((i) => i.id === b.dataset.edit)));
  view.querySelectorAll('[data-end]').forEach((b) => b.onclick = async () => {
    try {
      const motivo = window.prompt('Motivo do encerramento (opcional):') || '';
      await encerrarVinculo(b.dataset.end, motivo);
      await tryAuditLog({ action: 'ENCERRAR', entity: 'vinculos', entityId: b.dataset.end, details: { motivo } });
      toast('Vínculo encerrado');
      renderVinculos(view);
    } catch (error) { toast(toFriendlyErrorMessage(error), 'error'); }
  });
  view.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
    try {
      const confirmed = await confirmDestructiveModal('Confirme a remoção permanente do vínculo.');
      if (!confirmed) return;
      await deleteVinculo(b.dataset.del);
      await tryAuditLog({ action: 'DELETE', entity: 'vinculos', entityId: b.dataset.del, details: { mode: 'hard_delete' } });
      renderVinculos(view);
    } catch (error) { toast(toFriendlyErrorMessage(error), 'error'); }
  });
  view.querySelectorAll('[data-arq]').forEach((b) => b.onclick = async () => {
    const item = items.find((i) => i.id === b.dataset.arq);
    if (!item?.termo_url) return;
    try {
      const url = await getVinculoFileUrl(item.termo_url);
      if (!url) return toast('Não foi possível gerar URL do arquivo. Verifique policy do bucket.', 'error');
      window.open(url, '_blank');
    } catch (error) {
      toast(toFriendlyErrorMessage(error), 'error');
    }
  });
}
