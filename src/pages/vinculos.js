import { createVinculo, deleteVinculo, encerrarVinculo, getVinculoFileUrl, listVinculos, updateVinculo } from '../api/vinculos.js';
import { listEquipamentos } from '../api/equipamentos.js';
import { listObras } from '../api/obras.js';
import { uploadTermo } from '../api/storage.js';
import { state } from '../state.js';
import { closeModal, confirmDialog, openModal, toast, escapeHtml } from '../ui.js';
import { toFriendlyErrorMessage } from '../supabaseClient.js';

const daysWithUser = (date) => date ? Math.floor((Date.now() - new Date(date).getTime()) / 86400000) : '-';

function vinculoForm({ item = {}, equipamentos = [], obras = [] }) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<form>
    <div class="grid">
      <select name="equipamento_id" required><option value="">Equipamento</option>${equipamentos.map((e) => `<option value="${e.id}" ${item.equipamento_id === e.id ? 'selected' : ''}>${escapeHtml(e.codigo)} - ${escapeHtml(e.nome)}</option>`).join('')}</select>
      <select name="obra_id" required><option value="">Obra</option>${obras.map((o) => `<option value="${o.id}" ${item.obra_id === o.id ? 'selected' : ''}>${escapeHtml(o.codigo)} - ${escapeHtml(o.nome)}</option>`).join('')}</select>
      <input name="user_id" placeholder="user_id" value="${escapeHtml(item.user_id || state.user.id)}" required />
      <input type="date" name="data_entrega" value="${escapeHtml(item.data_entrega || '')}" required />
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
    ${items.map((i) => `<tr>
      <td>${escapeHtml(i.equipamento?.codigo || eqMap[i.equipamento_id]?.codigo || i.equipamento_id)}</td>
      <td>${escapeHtml(i.obra?.codigo || obMap[i.obra_id]?.codigo || i.obra_id)}</td>
      <td>${escapeHtml(i.user_id)}</td>
      <td>${escapeHtml(i.data_entrega || '')}</td>
      <td>${daysWithUser(i.data_entrega)}</td>
      <td>${i.termo_path ? `<button class='small secondary' data-arq='${i.id}'>Abrir</button>` : '-'}</td>
      <td class="row"><button class="small" data-edit="${i.id}">Editar</button><button class="small" data-end="${i.id}">Encerrar</button><button class="small danger" data-del="${i.id}">Excluir</button></td>
    </tr>`).join('') || '<tr><td colspan="7">Sem vínculos</td></tr>'}
    </tbody></table></div></div>`;

  const openEditor = (item = null) => {
    const content = vinculoForm({ item: item || {}, equipamentos, obras });
    openModal(item ? 'Editar vínculo' : 'Novo vínculo', content);
    content.querySelector('#save-v').onclick = async () => {
      try {
        const form = content.querySelector('form');
        const fd = new FormData(form);
        const payload = Object.fromEntries(fd.entries());
        if (!payload.equipamento_id || !payload.obra_id || !payload.user_id || !payload.data_entrega) {
          return toast('Campos obrigatórios: equipamento, obra, user_id, entrega', 'error');
        }
        const file = form.querySelector('input[name="termo"]').files[0];
        if (file) {
          const obraCodigo = (obras.find((o) => o.id === payload.obra_id)?.codigo || 'obra').toString();
          const equipamentoCodigo = (equipamentos.find((e) => e.id === payload.equipamento_id)?.codigo || 'equip').toString();
          payload.termo_path = await uploadTermo({ file, obraCodigo, equipamentoCodigo });
        }
        delete payload.termo;
        if (item) await updateVinculo(item.id, payload); else await createVinculo(payload);
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
  view.querySelectorAll('[data-end]').forEach((b) => b.onclick = async () => { try { await encerrarVinculo(b.dataset.end); toast('Vínculo encerrado'); renderVinculos(view); } catch (error) { toast(toFriendlyErrorMessage(error), 'error'); } });
  view.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { try { if (!confirmDialog('Excluir vínculo?')) return; await deleteVinculo(b.dataset.del); renderVinculos(view); } catch (error) { toast(toFriendlyErrorMessage(error), 'error'); } });
  view.querySelectorAll('[data-arq]').forEach((b) => b.onclick = async () => {
    const item = items.find((i) => i.id === b.dataset.arq);
    if (!item?.termo_path) return;
    try {
      const url = await getVinculoFileUrl(item.termo_path);
      if (!url) return toast('Não foi possível gerar URL do arquivo. Verifique policy do bucket.', 'error');
      window.open(url, '_blank');
    } catch (error) {
      toast(toFriendlyErrorMessage(error), 'error');
    }
  });
}
