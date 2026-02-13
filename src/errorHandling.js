import { toast, openModal, escapeHtml } from './ui.js';
import { tryAuditLog } from './audit.js';
import { addDiagnosticError, state } from './state.js';

export function classifyError(error) {
  const code = String(error?.code || '');
  const status = Number(error?.status || 0);
  const message = String(error?.message || error || '').toLowerCase();

  if (status === 401) return { userMessage: 'Sessão expirada. Faça login novamente.', kind: '401' };
  if (status === 403) return { userMessage: 'Acesso negado para esta operação.', kind: '403' };
  if (code === '42703') return { userMessage: 'Incompatibilidade de schema detectada. Contate o administrador.', kind: '42703' };
  if (message.includes('tempo limite') || message.includes('timeout')) return { userMessage: 'A requisição demorou demais. Tente novamente.', kind: 'TIMEOUT' };
  if (message.includes('failed to fetch') || message.includes('network')) return { userMessage: 'Falha de rede. Verifique a conexão e tente novamente.', kind: 'NETWORK' };
  return { userMessage: error?.message || 'Ocorreu um erro inesperado.', kind: 'GENERIC' };
}

function showAdminErrorDetails(error, context, classified) {
  if (state.role !== 'ADMIN') return;
  const content = document.createElement('div');
  content.innerHTML = `<p>Ocorreu um erro inesperado na aplicação.</p><details><summary>Detalhes técnicos (ADMIN)</summary><pre>${escapeHtml(
    JSON.stringify(
      {
        context,
        kind: classified.kind,
        code: error?.code ?? null,
        status: error?.status ?? null,
        message: error?.message || String(error)
      },
      null,
      2
    )
  )}</pre></details>`;
  openModal('Erro da aplicação', content);
}

export async function handleGlobalError(error, context = 'global') {
  const classified = classifyError(error);
  addDiagnosticError(error, context);

  await tryAuditLog({
    action: 'ERROR',
    entity: context,
    severity: 'ERROR',
    details: {
      kind: classified.kind,
      status: error?.status ?? null,
      code: error?.code ?? null,
      message: error?.message || String(error)
    }
  });

  toast(classified.userMessage, 'error');
  showAdminErrorDetails(error, context, classified);
  return classified;
}
