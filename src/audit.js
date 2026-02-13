import { supabase } from './supabaseClient.js';
import { state } from './state.js';
import { nowUtcIso } from './shared_datetime.js';
import { APP_VERSION } from './version.js';
import { pageCorrelationId } from './logger.js';

function sanitizeDetails(details = {}) {
  const clone = { ...details };
  delete clone.password;
  delete clone.token;
  return clone;
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
  const payload = {
    user_id: state.user?.id || null,
    // Single-tenant: não depende disso (DB pode preencher), mas se existir ajuda para rastreio
    organization_id: state.profile?.organization_id || state.organization_id || null,
    action: `${action}:${entity}`,
    created_at: nowUtcIso(),
    user_ref: state.user?.id || null,
    payload: {
      entity,
      entity_id: entityId,
      severity,
      route,
      app_version: APP_VERSION,
      correlation_id: pageCorrelationId,
      details: sanitizeDetails(details),
      before: before ? sanitizeDetails(before) : null,
      after: after ? sanitizeDetails(after) : null
    }
  };

  try {
    const { error } = await supabase.from('audit_log').insert(payload);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('audit_log insert failed', error?.message || error);
    return false;
  }
}

