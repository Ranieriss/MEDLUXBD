import { createMedicao, deleteMedicao, listMedicoes, updateMedicao } from '../api/medicoes.js';
import { listEquipamentos } from '../api/equipamentos.js';
import { listObras } from '../api/obras.js';
import { state } from '../state.js';
import { closeModal, confirmDialog, openModal, toast, escapeHtml } from '../ui.js';

function formMedicao({ item = {}, equipamentos = [], obras = [] }) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<form>
    <div class="grid">
      <select name="equipamento_id" required><option value="">Equipamento</option>${equipamentos.map((e) => `<option value="${e.id}" ${item.equipamento_id === e.id ? 'selected' : ''}>${escapeHtml(e.codigo)} - ${escapeHtml(e.nome)}</option>`).join('')}</select>
      <select name="obra_id" required><option value="">Obra</option>${obras.map((o) => `<option value="${o.id}" ${item.obra_id === o.id ? 'selected' : ''}>${escapeHtml(o.codigo)} - ${escapeHtml(o.nome)}</option>`).join('')}</select>
      <input name="user_id" value="${escapeHtml(item.user_id || state.user.id)}" required />
      <input name="tipo" placeholder="Tipo" value="${escapeHtml(item.tipo || '')}" required />
      <input name="valor" type="number" step="0.01" placeholder="Valor" value="${escapeHtml(item.valor || '')}" required />
      <input name="unidade" placeholder="Unidade" value="${escapeHtml(item.unidade || '')}" required />
      <select name="conforme"><option value="true" ${item.conforme ? 'selected' : ''}>Conforme</option><option value="false" ${item.conforme === false ? 'selected' : ''}>Não conforme</option></select>
      <input type="datetime-local" name="medido_em" value="${escapeHtml((item.medido_em || '').slice(0, 16))}" required />
    </div>
    <textarea name="observacoes" placeholder="Observações">${escapeHtml(item.observacoes || '')}</textarea>
    <div class="row" style="margin-top:.7rem;"><button type="button" id="save-m">Salvar</button></div>
  </form>`;
  return wrap;
}

function printMedicao(item) {
  const html = `<!doctype html><html><head><title>Medição ${item.id}</title></head><body><h1>Medição #${item.id}</h1><ul>${Object.entries(item).map(([k,v])=>`<li><b>${k}</b>: ${v ?? ''}</li>`).join('')}</ul></body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

export async function renderMedicoes(view) {
  const [equipamentos, obras] = await Promise.all([listEquipamentos(), listObras()]);
  let filters = {};
  let items = await listMedicoes(filters);
  state.cache.medicoes = items;

  const redraw = async () => {
    items = await listMedicoes(filters);
    view.innerHTML = `<div class="panel"><div class="row"><h2>Medições</h2><select id="f-obra"><option value="">Todas obras</option>${obras.map(o=>`<option value="${o.id}" ${filters.obra_id===o.id?'selected':''}>${escapeHtml(o.codigo)}</option>`).join('')}</select><select id="f-eq"><option value="">Todos equipamentos</option>${equipamentos.map(e=>`<option value="${e.id}" ${filters.equipamento_id===e.id?'selected':''}>${escapeHtml(e.codigo)}</option>`).join('')}</select><button id="novo" class="small">Novo</button></div>
      <div class="table-wrap"><table><thead><tr><th>Tipo</th><th>Valor</th><th>Conforme</th><th>Medição em</th><th>Ações</th></tr></thead><tbody>
      ${items.map(i => `<tr><td>${escapeHtml(i.tipo)}</td><td>${escapeHtml(i.valor)} ${escapeHtml(i.unidade)}</td><td>${i.conforme ? 'Sim' : 'Não'}</td><td>${escapeHtml(i.medido_em || '')}</td><td class="row"><button class="small" data-edit="${i.id}">Editar</button><button class="small secondary" data-pdf="${i.id}">Gerar PDF individual</button><button class="small danger" data-del="${i.id}">Excluir</button></td></tr>`).join('') || '<tr><td colspan="5">Sem medições</td></tr>'}
      </tbody></table></div></div>`;

    view.querySelector('#f-obra').onchange = (e) => { filters.obra_id = e.target.value || undefined; redraw(); };
    view.querySelector('#f-eq').onchange = (e) => { filters.equipamento_id = e.target.value || undefined; redraw(); };
    view.querySelector('#novo').onclick = () => openEditor();
    view.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => openEditor(items.find(i => i.id === b.dataset.edit)));
    view.querySelectorAll('[data-pdf]').forEach((b) => b.onclick = () => printMedicao(items.find(i => i.id === b.dataset.pdf)));
    view.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { if (!confirmDialog('Excluir medição?')) return; await deleteMedicao(b.dataset.del); redraw(); });
  };

  const openEditor = (item = null) => {
    const content = formMedicao({ item: item || {}, equipamentos, obras });
    openModal(item ? 'Editar medição' : 'Nova medição', content);
    content.querySelector('#save-m').onclick = async () => {
      const payload = Object.fromEntries(new FormData(content.querySelector('form')).entries());
      if (!payload.equipamento_id || !payload.obra_id || !payload.user_id || !payload.tipo || !payload.valor || !payload.unidade || !payload.medido_em) {
        return toast('Preencha todos os campos obrigatórios', 'error');
      }
      payload.conforme = payload.conforme === 'true';
      if (item) await updateMedicao(item.id, payload); else await createMedicao(payload);
      closeModal();
      redraw();
      toast('Medição salva');
    };
  };

  redraw();
}
