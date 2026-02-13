import { supabase, runQuery } from '../supabaseClient.js';

const PROFILE_COLUMNS = 'id,email,nome,role,organization_id,created_at,updated_at';

export function ensureProfileShape(profile = {}, fallback = {}) {
  const email = profile.email || fallback.email || '';
  const nomeBase = email.includes('@') ? email.split('@')[0] : email;

  return {
    id: profile.id || fallback.id || null,
    email,
    nome: profile.nome || nomeBase || 'Usuário',
    role: profile.role || fallback.role || 'USER',
    organization_id: profile.organization_id || fallback.organization_id || null
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


export async function hasUsuarioDependencies(userId) {
  const vinculos = await runQuery(
    supabase.from('vinculos').select('id').eq('user_id', userId).limit(1),
    'profiles.dep.vinculos'
  );
  return (vinculos?.length || 0) > 0;
}
