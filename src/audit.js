import { supabase } from './supabaseClient.js';
import { state } from './state.js';
import { nowUtcIso } from './shared_datetime.js';
import { getCurrentOrgId } from './api/org.js';

function sanitizeDetails(details = {}) {
  const clone = { ...details };
  delete clone.password;
  delete clone.token;
  return clone;
}

export async function tryAuditLog({ action, entity, entityId = null, severity = 'INFO', details = {}, before = null, after = null }) {
  const organization_id = await getCurrentOrgId();
  const payload = {
    user_id: state.user?.id || null,
    organization_id,
    action: `${action}:${entity}`,
    created_at: nowUtcIso(),
    payload: {
      entity,
      entity_id: entityId,
      severity,
      details: {
        ...sanitizeDetails(details),
        before: sanitizeDetails(before || {}),
        after: sanitizeDetails(after || {})
      }
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
