import { supabase, runQuery } from '../supabaseClient.js';

const PROFILE_COLUMNS = 'id,email,nome,role,org_id,organization_id,created_at,updated_at';

export function ensureProfileShape(profile = {}, fallback = {}) {
  const email = profile.email || fallback.email || '';
  const nomeBase = email.includes('@') ? email.split('@')[0] : email;

  const orgId = profile.org_id || profile.organization_id || fallback.org_id || fallback.organization_id || null;

  return {
    id: profile.id || fallback.id || null,
    email,
    nome: profile.nome || nomeBase || 'Usuário',
    role: profile.role || fallback.role || 'USER',
    org_id: orgId,
    organization_id: orgId
  };
}

export const getMyProfile = async (userId) => {
  const data = await runQuery(
    supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle(),
    'profiles.getMyProfile'
  );
  return data ? ensureProfileShape(data, { id: userId }) : null;
};

export const upsertProfile = async (payload) => {
  const complete = ensureProfileShape(payload, payload);
  return runQuery(
    supabase.from('profiles').upsert(complete).select(PROFILE_COLUMNS).single(),
    'profiles.upsert'
  );
};

export async function getDefaultOrganizationId() {
  try {
    const rows = await runQuery(
      supabase.from('organizations').select('id,nome,name').limit(20),
      'organizations.listForDefault'
    );

    if (!rows?.length) return null;
    const byName = rows.find((org) => /icd\s*vias/i.test(org?.nome || org?.name || ''));
    return byName?.id || rows[0]?.id || null;
  } catch (error) {
    console.warn('[MEDLUXBD] Não foi possível resolver organização padrão para profile.', error?.message || error);
    return null;
  }
}

export async function ensureUserProfileWithOrg(user) {
  if (!user?.id) return null;

  let profile = await getMyProfile(user.id);
  if (!profile) {
    const defaultOrgId = await getDefaultOrganizationId();
    profile = await upsertProfile({
      id: user.id,
      role: 'USER',
      email: user.email,
      nome: (user.email || '').split('@')[0] || 'Usuário',
      org_id: defaultOrgId,
      organization_id: defaultOrgId
    });
  }

  const completeProfile = ensureProfileShape(profile, {
    id: user.id,
    email: user.email,
    role: 'USER'
  });

  if (!completeProfile.org_id) {
    const defaultOrgId = await getDefaultOrganizationId();
    if (defaultOrgId) {
      completeProfile.org_id = defaultOrgId;
      completeProfile.organization_id = defaultOrgId;
    } else {
      console.warn('[MEDLUXBD] org_id está nulo no profile. Configure public.profiles.org_id no Supabase para liberar multi-tenant.');
    }
  }

  if (!profile?.nome || !profile?.email || !profile?.role || (!profile?.org_id && completeProfile.org_id)) {
    profile = await upsertProfile(completeProfile);
    return ensureProfileShape(profile, completeProfile);
  }

  return completeProfile;
}

export async function hasUsuarioDependencies(userId) {
  const vinculos = await runQuery(
    supabase.from('vinculos').select('id').eq('user_id', userId).limit(1),
    'profiles.dep.vinculos'
  );
  return (vinculos?.length || 0) > 0;
}
