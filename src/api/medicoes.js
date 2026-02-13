import { supabase, runQuery } from '../supabaseClient.js';
import { MEDICAO_SELECT_COLUMNS } from './selectColumns.js';
import { nowUtcIso } from '../shared_datetime.js';
import { state } from '../state.js';

export async function listMedicoes(filters = {}) {
  let q = supabase.from('medicoes').select(MEDICAO_SELECT_COLUMNS).order('medido_em', { ascending: false });
  if (filters.obra_id) q = q.eq('obra_id', filters.obra_id);
  if (filters.equipamento_id) q = q.eq('equipamento_id', filters.equipamento_id);
  return runQuery(q, 'medicoes.list');
}

export const createMedicao = (payload) => runQuery(
  supabase.from('medicoes').insert({ ...payload, created_at: payload.created_at || nowUtcIso() }).select(MEDICAO_SELECT_COLUMNS).single(),
  'medicoes.create'
);

export const updateMedicao = (id, payload) => runQuery(
  supabase.from('medicoes').update({ ...payload, updated_at: nowUtcIso() }).eq('id', id).select(MEDICAO_SELECT_COLUMNS).single(),
  'medicoes.update'
);

export const deleteMedicao = (id) => runQuery(supabase.from('medicoes').delete().eq('id', id), 'medicoes.delete');

export async function canCreateMedicao({ equipamento_id, user_id }) {
  const equipamentoRows = await runQuery(
    supabase.from('equipamentos').select('id').eq('id', equipamento_id).limit(1),
    'medicoes.checkEquipamento'
  );
  if (!equipamentoRows?.length) return false;
  if (state.role === 'ADMIN') return true;

  const vinculos = await runQuery(
    supabase.from('vinculos').select('id').eq('equipamento_id', equipamento_id).eq('user_id', user_id).eq('status', 'ATIVO').limit(1),
    'medicoes.checkVinculo'
  );
  return vinculos?.length > 0;
}
