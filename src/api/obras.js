import { supabase, runQuery } from '../supabaseClient.js';
import { OBRA_SELECT_COLUMNS } from './selectColumns.js';

export async function listObras() {
  return runQuery(supabase.from('obras').select(OBRA_SELECT_COLUMNS).order('created_at', { ascending: false }), 'obras.list');
}

export const createObra = (payload) => runQuery(
  supabase.from('obras').insert(payload).select(OBRA_SELECT_COLUMNS).single(),
  'obras.create'
);

export const updateObra = (id, payload) => runQuery(
  supabase.from('obras').update(payload).eq('id', id).select(OBRA_SELECT_COLUMNS).single(),
  'obras.update'
);

export const deleteObra = (id) => runQuery(supabase.from('obras').delete().eq('id', id), 'obras.delete');
