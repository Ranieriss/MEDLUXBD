import { supabase, getFriendlyDatabaseError, toFriendlyErrorMessage } from '../supabaseClient.js';
import { state } from '../state.js';
import { escapeHtml } from '../ui.js';

function formatError(err) {
  const friendly = getFriendlyDatabaseError(err.raw || err);
  return {
    ...err,
    message: friendly || err.message,
    details: friendly ? '' : (err.details || '')
  };
}

function stringifyPayload(payload) {
  if (!payload) return '{}';
  try {
    return JSON.stringify(payload, null, 2);
  } catch (_) {
    return '{}';
  }
}

export async function renderAuditoria(view) {
  let auditRows = [];
  let auditMsg = '';
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('id,user_id,action,payload,created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    auditRows = data || [];
  } catch (e) {
    auditMsg = `Audit log indisponível: ${toFriendlyErrorMessage(e)}`;
  }

  const mappedErrors = state.errors.map(formatError);

  view.innerHTML = `<div class="panel"><h2>Auditoria e Diagnóstico</h2>
  <h3>Erros recentes (cliente)</h3><div class="table-wrap"><table><thead><tr><th>Quando</th><th>Contexto</th><th>Mensagem</th><th>Detalhes</th></tr></thead><tbody>
  ${mappedErrors.map((e) => `<tr><td>${escapeHtml(e.at)}</td><td>${escapeHtml(e.context)}</td><td>${escapeHtml(e.message)}</td><td>${escapeHtml(e.details || '-')}</td></tr>`).join('') || '<tr><td colspan="4">Sem erros</td></tr>'}
  </tbody></table></div>
  <h3>Eventos cliente</h3><div class="table-wrap"><table><thead><tr><th>Quando</th><th>Tipo</th><th>Mensagem</th></tr></thead><tbody>
  ${state.events.map((e) => `<tr><td>${escapeHtml(e.at)}</td><td>${escapeHtml(e.type || '')}</td><td>${escapeHtml(e.message || '')}</td></tr>`).join('') || '<tr><td colspan="3">Sem eventos</td></tr>'}
  </tbody></table></div>
  <h3>Audit log (Supabase)</h3>
  <p class="muted">${escapeHtml(auditMsg || 'OK')}</p>
  <div class="table-wrap"><table><thead><tr><th>ID</th><th>Quando</th><th>Usuário</th><th>Ação</th><th>Payload</th></tr></thead><tbody>
  ${auditRows.map((r) => `<tr><td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.created_at || '')}</td><td>${escapeHtml(r.user_id || '-')}</td><td>${escapeHtml(r.action || '')}</td><td><pre>${escapeHtml(stringifyPayload(r.payload))}</pre></td></tr>`).join('') || '<tr><td colspan="5">Não configurado</td></tr>'}
  </tbody></table></div>
  </div>`;
}
