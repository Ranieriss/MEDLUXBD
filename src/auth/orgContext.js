import { supabase } from '../supabaseClient.js';

let orgInitialized = false;
let currentUserId = null;
let cachedOrgId = null;
let cachedRole = null;

function normalizeOrgId(profile) {
  return profile?.org_id || profile?.organization_id || null;
}

export async function resetOrgContext() {
  orgInitialized = false;
  currentUserId = null;
  cachedOrgId = null;
  cachedRole = null;
}

export function getCachedOrgContext() {
  return {
    orgId: cachedOrgId,
    role: cachedRole
  };
}

export async function ensureOrgContext() {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) throw userError;

  if (!user) {
    resetOrgContext();
    return { orgId: null, role: null };
  }

  if (orgInitialized && currentUserId === user.id) {
    return { orgId: cachedOrgId, role: cachedRole };
  }

  currentUserId = user.id;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, organization_id, role')
    .eq('id', user.id)
    .single();

  if (profileError) throw profileError;

  const orgId = normalizeOrgId(profile);
  const role = profile?.role || null;

  if (!orgId && role !== 'ADMIN') {
    console.error('[MEDLUXBD] org_id ausente em public.profiles para o usuário autenticado.', {
      userId: user.id,
      email: user.email || null
    });

    throw new Error('Usuário não possui org_id definido. Contate o administrador para configurar o profile.');
  }

  cachedOrgId = orgId;
  cachedRole = role;
  orgInitialized = true;

  if (orgId) {
    console.info('✅ Organização do usuário carregada via profile.org_id:', orgId);
  } else {
    console.info('✅ Usuário ADMIN sem org_id explícito detectado.');
  }

  return { orgId, role };
}
