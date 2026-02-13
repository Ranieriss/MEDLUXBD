import { supabase, runQuery } from '../supabaseClient.js';
import { OBRA_SELECT_COLUMNS } from './selectColumns.js';
import { nowUtcIso } from '../shared_datetime.js';

export async function listObras() {
  return runQuery(supabase.from('obras').select(OBRA_SELECT_COLUMNS).order('created_at', { ascending: false }), 'obras.list');
}

export const createObra = (payload) => runQuery(
  supabase.from('obras').insert({ ...payload, created_at: payload.created_at || nowUtcIso() }).select(OBRA_SELECT_COLUMNS).single(),
  'obras.create'
);

export const updateObra = (id, payload) => runQuery(
  supabase.from('obras').update({ ...payload, updated_at: nowUtcIso() }).eq('id', id).select(OBRA_SELECT_COLUMNS).single(),
  'obras.update'
);

export const deleteObra = (id) => runQuery(
  supabase.from('obras').update({ status: 'INATIVA', updated_at: nowUtcIso() }).eq('id', id),
  'obras.softDelete'
);
