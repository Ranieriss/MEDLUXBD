import { state } from '../state.js';
import { ensureOrgContext, getCachedOrgContext } from '../auth/orgContext.js';

function profileOrgId() {
  return state.profile?.org_id || state.profile?.organization_id || null;
}

export async function getCurrentOrgIdOrWarn(context = 'tenant') {
  const fromProfile = profileOrgId();
  if (fromProfile) return fromProfile;

  const cached = getCachedOrgContext()?.orgId;
  if (cached) return cached;

  try {
    const ctx = await ensureOrgContext();
    if (ctx?.orgId) return ctx.orgId;
  } catch (error) {
    console.warn(`[MEDLUXBD][${context}] Falha ao resolver org_id pelo contexto autenticado.`, error);
  }

  console.warn(
    `[MEDLUXBD][${context}] org_id está nulo. Configure public.profiles.org_id para o usuário autenticado no Supabase.`
  );
  return null;
}

export async function ensurePayloadOrgId(payload = {}, context = 'tenant') {
  const orgId = await getCurrentOrgIdOrWarn(context);
  if (!orgId) return payload;

  return {
    ...payload,
    org_id: payload.org_id || orgId,
    organization_id: payload.organization_id || orgId
  };
}
