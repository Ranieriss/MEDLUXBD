import { state } from './state.js';

export function getOrganizationId() {
  return state.profile?.organization_id || state.organization_id || null;
}

export function requireOrganizationId(context = 'tenant') {
  const organizationId = getOrganizationId();
  if (!organizationId) {
    throw new Error(`Organização não definida para ${context}.`);
  }
  return organizationId;
}

export function withOrganization(payload = {}, context = 'tenant') {
  return {
    ...payload,
    organization_id: payload.organization_id || requireOrganizationId(context)
  };
}

export function applyOrganizationFilter(query, context = 'tenant') {
  return query.eq('organization_id', requireOrganizationId(context));
}
