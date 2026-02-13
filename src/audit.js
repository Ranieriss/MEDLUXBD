import { supabase } from './supabaseClient.js';
import { state } from './state.js';
import { nowUtcIso } from './shared_datetime.js';

function sanitizeDetails(details = {}) {
  const clone = { ...details };
  delete clone.password;
  delete clone.token;
  return clone;
}

export async function tryAuditLog({ action, entity, entityId = null, severity = 'INFO', details = {} }) {
  const payload = {
    user_id: state.user?.id || null,
    organization_id: state.profile?.organization_id || state.organization_id || null,
    action: `${action}:${entity}`,
    created_at: nowUtcIso(),
    user_ref: state.user?.id || null,
    payload: {
      entity,
      entity_id: entityId,
      severity,
      details: sanitizeDetails(details)
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
