import { supabase, runQuery } from '../supabaseClient.js';
import { isAdmin, state } from '../state.js';

export async function listObras() {
  if (isAdmin()) return runQuery(supabase.from('obras').select('*').order('created_at', { ascending: false }), 'obras.list');
  const vinculos = await runQuery(
    supabase.from('vinculos').select('obra_id').eq('user_id', state.user.id).is('encerrou_em', null),
    'obras.list.vinculos'
  );
  const ids = [...new Set(vinculos.map((v) => v.obra_id).filter(Boolean))];
  if (!ids.length) return [];
  return runQuery(supabase.from('obras').select('*').in('id', ids), 'obras.list.restricted');
}

export const createObra = (payload) => runQuery(supabase.from('obras').insert(payload).select().single(), 'obras.create');
export const updateObra = (id, payload) => runQuery(supabase.from('obras').update(payload).eq('id', id).select().single(), 'obras.update');
export const deleteObra = (id) => runQuery(supabase.from('obras').delete().eq('id', id), 'obras.delete');
