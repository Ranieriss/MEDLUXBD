import { supabase, runQuery } from '../supabaseClient.js';
import { MEDICAO_SELECT_COLUMNS } from './selectColumns.js';
import { nowUtcIso } from '../shared_datetime.js';
import { state } from '../state.js';
import { getCurrentOrgId } from './org.js';

const MEDICAO_LEGACY_COLUMNS = 'id,equipamento_id,obra_id,user_id,tipo,valor,unidade,conforme,data,medido_em,observacoes,created_at,updated_at';

export async function listMedicoes(filters = {}, options = {}) {
  let q = supabase.from('medicoes').select(MEDICAO_SELECT_COLUMNS).order('medido_em', { ascending: false });
  if (!options.includeDeleted) q = q.is('deleted_at', null);
  if (filters.obra_id) q = q.eq('obra_id', filters.obra_id);
  if (filters.equipamento_id) q = q.eq('equipamento_id', filters.equipamento_id);
  try {
    return await runQuery(q, 'medicoes.list');
  } catch (error) {
    if (String(error?.code) !== '42703') throw error;
    let legacyQuery = supabase.from('medicoes').select(MEDICAO_LEGACY_COLUMNS).order('medido_em', { ascending: false });
    if (filters.obra_id) legacyQuery = legacyQuery.eq('obra_id', filters.obra_id);
    if (filters.equipamento_id) legacyQuery = legacyQuery.eq('equipamento_id', filters.equipamento_id);
    return runQuery(legacyQuery, 'medicoes.listLegacy');
  }
}

export const createMedicao = async (payload) => {
  const organization_id = await getCurrentOrgId();
  return runQuery(
    supabase.from('medicoes').insert({ ...payload, organization_id, created_at: payload.created_at || nowUtcIso() }).select(MEDICAO_SELECT_COLUMNS).single(),
    'medicoes.create'
  );
};

export const updateMedicao = async (id, payload) => {
  const organization_id = await getCurrentOrgId();
  return runQuery(
    supabase.from('medicoes').update({ ...payload, organization_id, updated_at: nowUtcIso() }).eq('id', id).select(MEDICAO_SELECT_COLUMNS).single(),
    'medicoes.update'
  );
};

export const deleteMedicao = async (id) => {
  try {
    return await runQuery(supabase.from('medicoes').update({ deleted_at: nowUtcIso(), updated_at: nowUtcIso() }).eq('id', id), 'medicoes.softDelete');
  } catch (error) {
    if (String(error?.code) !== '42703') throw error;
    return runQuery(supabase.from('medicoes').delete().eq('id', id), 'medicoes.deleteLegacy');
  }
};

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
