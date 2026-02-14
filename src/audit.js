import { supabase } from './supabaseClient.js';
import { state } from './state.js';
import { APP_VERSION } from './version.js';
import { pageCorrelationId } from './logger.js';

function sanitizeDetails(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeDetails(item));
  if (typeof value !== 'object') return value;

  const clone = {};
  Object.entries(value).forEach(([key, entryValue]) => {
    const normalizedKey = String(key || '').toLowerCase();
    if (normalizedKey.includes('password') || normalizedKey.includes('token')) return;
    clone[key] = sanitizeDetails(entryValue);
  });
  return clone;
}

function normalizeSeverity(action, severity) {
  const actionUpper = String(action || '').toUpperCase();
  if (['DELETE', 'SOFT_DELETE', 'ENCERRAR', 'INATIVAR'].includes(actionUpper)) return 'WARN';
  return severity || 'INFO';
}

export async function tryAuditLog({
  action,
  entity,
  entityId = null,
  severity = 'INFO',
  details = {},
  before = null,
  after = null,
  route = window.location.hash.replace('#', '') || '/'
}) {
  const normalizedSeverity = normalizeSeverity(action, severity);
  const row = {
    user_id: state.user?.id || null,
    user_ref: state.user?.email || state.user?.id || null,
    action: `${action}:${entity}`,
    payload: {
      entity,
      entity_id: entityId,
      severity: normalizedSeverity,
      route,
      app_version: APP_VERSION,
      correlation_id: pageCorrelationId,
      details: sanitizeDetails(details || {}),
      before: before ? sanitizeDetails(before) : null,
      after: after ? sanitizeDetails(after) : null
    }
  };

  try {
    const { error } = await supabase.from('audit_log').insert(row);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('audit_log insert failed', error?.message || error);
    return false;
  }
}
