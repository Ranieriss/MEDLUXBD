import { supabase, runQuery } from '../supabaseClient.js';
import { isAdmin, state } from '../state.js';

export async function listMedicoes(filters = {}) {
  let q = supabase.from('medicoes').select('*').order('medido_em', { ascending: false });
  if (!isAdmin()) q = q.eq('user_id', state.user.id);
  if (filters.obra_id) q = q.eq('obra_id', filters.obra_id);
  if (filters.equipamento_id) q = q.eq('equipamento_id', filters.equipamento_id);
  return runQuery(q, 'medicoes.list');
}

export const createMedicao = (payload) => runQuery(supabase.from('medicoes').insert(payload).select().single(), 'medicoes.create');
export const updateMedicao = (id, payload) => runQuery(supabase.from('medicoes').update(payload).eq('id', id).select().single(), 'medicoes.update');
export const deleteMedicao = (id) => runQuery(supabase.from('medicoes').delete().eq('id', id), 'medicoes.delete');
