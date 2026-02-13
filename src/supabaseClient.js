import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  validateSupabaseConfig
} from './config.js';
import { addDiagnosticError, addEvent, isAdmin } from './state.js';
import { toast, openModal, escapeHtml } from './ui.js';
import { createLogger } from './logger.js';
import { tryAuditLog } from './audit.js';

const clientLogger = createLogger('supabase');
const configErrorMessage = validateSupabaseConfig();
if (configErrorMessage) {
  toast(configErrorMessage, 'error');
  console.error(configErrorMessage);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

const EMAIL_AUTH_DISABLED_TEXT = 'Email logins are disabled';
const EMAIL_AUTH_DISABLED_GUIDANCE =
  'Ative Email Provider no Supabase: Authentication → Sign In / Providers → Email.';

const DATABASE_ERROR_MESSAGES = {
  '23502': 'Campo obrigatório não preenchido',
  '42703': 'Seu frontend está pedindo uma coluna que não existe no banco. Verifique versão do schema.'
};

export function normalizeAppError(error, context = 'app') {
  const status = Number(error?.status || 0);
  const code = String(error?.code || '');
  const message = String(error?.message || error || 'Erro desconhecido');
  let friendly = toFriendlyErrorMessage(error);
  if (status === 401 || status === 403) friendly = 'Sem permissão para esta ação. Faça login novamente ou valide seu perfil.';
  if (status === 400) friendly = 'Requisição inválida. Revise os campos obrigatórios e tente novamente.';
  if (code === '42703') friendly = DATABASE_ERROR_MESSAGES['42703'];
  if (message.toLowerCase().includes('failed to fetch')) friendly = 'Falha de rede ao comunicar com Supabase.';
  return { status, code, context, message, friendly, raw: error };
}

export function handleAppError(error, context = 'app') {
  const normalized = normalizeAppError(error, context);
  toast(normalized.friendly, 'error');
  addEvent({ type: 'ERROR', message: `${context}: ${normalized.friendly}`, details: { code: normalized.code, status: normalized.status } });
  if (isAdmin()) {
    const content = document.createElement('div');
    content.innerHTML = `<p>${escapeHtml(normalized.friendly)}</p><details><summary>Detalhes técnicos (ADMIN)</summary><pre>${escapeHtml(JSON.stringify({
      status: normalized.status,
      code: normalized.code,
      message: normalized.message,
      context
    }, null, 2))}</pre></details>`;
    openModal('Erro da operação', content);
  }
  return normalized;
}

export function getFriendlyDatabaseError(error) {
  const code = error?.code ? String(error.code) : '';
  if (DATABASE_ERROR_MESSAGES[code]) return DATABASE_ERROR_MESSAGES[code];
  return null;
}

export function toFriendlyErrorMessage(error, fallback = 'Ocorreu um erro inesperado.') {
  const dbMessage = getFriendlyDatabaseError(error);
  if (dbMessage) return dbMessage;
  const status = Number(error?.status || 0);
  const message = String(error?.message || error || '').toLowerCase();
  if (status === 401) return 'Sessão expirada. Faça login novamente.';
  if (status === 403) return 'Acesso negado para esta operação.';
  if (message.includes('tempo limite') || message.includes('timeout')) return 'A requisição demorou demais. Tente novamente.';
  if (message.includes('failed to fetch') || message.includes('network')) return 'Falha de rede. Verifique sua conexão.';
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return fallback;
}

export function isEmailAuthDisabledError(error) {
  const message = String(error?.message || error || '');
  const status = Number(error?.status);
  const statusBlocked = status === 400 || status === 403;
  return message.includes(EMAIL_AUTH_DISABLED_TEXT) && (statusBlocked || status === 0 || Number.isNaN(status));
}

export function getEmailAuthDisabledGuidance() {
  return EMAIL_AUTH_DISABLED_GUIDANCE;
}

export function getSupabaseErrorMessage(error) {
  const friendly = getFriendlyDatabaseError(error);
  if (friendly) return friendly;

  const message = error?.message || String(error || 'Erro desconhecido');
  const status = error?.status;
  const details = status ? `${message} (status: ${status})` : message;

  if (isEmailAuthDisabledError(error)) {
    return `${details} ${EMAIL_AUTH_DISABLED_GUIDANCE}`;
  }

  return details;
}

export function logSupabaseAuthError(error, context = 'auth') {
  clientLogger.error('Supabase auth error', {
    action: 'auth_error',
    entity: context,
    details: {
      status: error?.status ?? null,
      code: error?.code ?? null,
      message: error?.message ?? String(error)
    }
  });
}

export function logSupabaseRestError(error, context = 'rest') {
  clientLogger.error('Supabase REST error', {
    action: 'rest_error',
    entity: context,
    details: {
      status: error?.status ?? null,
      code: error?.code ?? null,
      message: error?.message ?? String(error)
    }
  });
}

export function assertSupabaseConfig() {
  if (configErrorMessage) {
    const err = new Error(configErrorMessage);
    addDiagnosticError(err, 'config.supabase');
    throw err;
  }
}

async function withTimeout(queryPromise, timeoutMs = 12000) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Tempo limite excedido (${timeoutMs}ms)`)), timeoutMs);
  });

  try {
    return await Promise.race([queryPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function runQuery(promise, context = 'api', meta = {}) {
  assertSupabaseConfig();
  try {
    const { data, error } = await withTimeout(promise);
    if (error) throw error;
    return data;
  } catch (error) {
    logSupabaseRestError(error, context);
    addDiagnosticError(error, context);
    handleAppError(error, context);
    await tryAuditLog({ action: 'ERROR', entity: context, severity: 'ERROR', details: { ...meta, message: error?.message, status: error?.status, code: error?.code } });
    throw error;
  }
}

export async function getSignedFileUrl(path, expiresIn = 120) {
  assertSupabaseConfig();
  try {
    const { data, error } = await supabase.storage.from('medlux').createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data?.signedUrl;
  } catch (err) {
    addDiagnosticError(err, `storage.signedUrl:${path}`);
    const publicData = supabase.storage.from('medlux').getPublicUrl(path);
    return publicData?.data?.publicUrl;
  }
}
