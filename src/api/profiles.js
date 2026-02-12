import { supabase, runQuery } from '../supabaseClient.js';

export const getMyProfile = async (userId) => {
  const data = await runQuery(
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    'profiles.getMyProfile'
  );
  return data;
};

export const upsertProfile = async (payload) =>
  runQuery(supabase.from('profiles').upsert(payload).select().single(), 'profiles.upsert');
