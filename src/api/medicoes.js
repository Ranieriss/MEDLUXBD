import { supabase, runQuery } from '../supabaseClient.js';
import { MEDICAO_SELECT_COLUMNS } from './selectColumns.js';

export async function listMedicoes(filters = {}) {
  let q = supabase.from('medicoes').select(MEDICAO_SELECT_COLUMNS).order('medido_em', { ascending: false });
  if (filters.obra_id) q = q.eq('obra_id', filters.obra_id);
  if (filters.equipamento_id) q = q.eq('equipamento_id', filters.equipamento_id);
  return runQuery(q, 'medicoes.list');
}

export const createMedicao = (payload) => runQuery(
  supabase.from('medicoes').insert(payload).select(MEDICAO_SELECT_COLUMNS).single(),
  'medicoes.create'
);

export const updateMedicao = (id, payload) => runQuery(
  supabase.from('medicoes').update(payload).eq('id', id).select(MEDICAO_SELECT_COLUMNS).single(),
  'medicoes.update'
);

export const deleteMedicao = (id) => runQuery(supabase.from('medicoes').delete().eq('id', id), 'medicoes.delete');
