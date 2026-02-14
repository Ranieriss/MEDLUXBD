import { supabase, runQuery } from '../supabaseClient.js';
import { MEDICAO_SELECT_COLUMNS } from './selectColumns.js';
import { nowUtcIso } from '../shared_datetime.js';
import { ensurePayloadOrgId } from './tenant.js';
import { state } from '../state.js';

const MEDICAO_LEGACY_COLUMNS =
  'id,equipamento_id,obra_id,user_id,tipo,valor,unidade,conforme,data,medido_em,observacoes,created_at,updated_at';

export async function listMedicoes(filters = {}, { includeDeleted = false } = {}) {
  try {
    let query = supabase.from('medicoes').select(MEDICAO_SELECT_COLUMNS).order('medido_em', { ascending: false });

    if (!includeDeleted) query = query.is('deleted_at', null);
    if (filters?.equipamento_id) query = query.eq('equipamento_id', filters.equipamento_id);
    if (filters?.obra_id) query = query.eq('obra_id', filters.obra_id);
    if (filters?.user_id) query = query.eq('user_id', filters.user_id);
    if (filters?.tipo) query = query.eq('tipo', filters.tipo);
    if (filters?.data_from) query = query.gte('medido_em', filters.data_from);
    if (filters?.data_to) query = query.lte('medido_em', filters.data_to);

    return await runQuery(query, 'medicoes.list');
  } catch (error) {
    if (String(error?.code) !== '42703') throw error;

    let legacyQuery = supabase.from('medicoes').select(MEDICAO_LEGACY_COLUMNS).order('medido_em', { ascending: false });
    if (filters?.equipamento_id) legacyQuery = legacyQuery.eq('equipamento_id', filters.equipamento_id);
    if (filters?.obra_id) legacyQuery = legacyQuery.eq('obra_id', filters.obra_id);
    if (filters?.user_id) legacyQuery = legacyQuery.eq('user_id', filters.user_id);
    if (filters?.tipo) legacyQuery = legacyQuery.eq('tipo', filters.tipo);
    if (filters?.data_from) legacyQuery = legacyQuery.gte('medido_em', filters.data_from);
    if (filters?.data_to) legacyQuery = legacyQuery.lte('medido_em', filters.data_to);

    return runQuery(legacyQuery, 'medicoes.listLegacy');
  }
}

export const createMedicao = async (payload) => {
  const payloadWithOrg = await ensurePayloadOrgId(payload, 'medicoes.create');
  return runQuery(
    supabase
      .from('medicoes')
      .insert({ ...payloadWithOrg, created_at: payloadWithOrg.created_at || nowUtcIso() })
      .select(MEDICAO_SELECT_COLUMNS)
      .single(),
    'medicoes.create'
  );
};

export const updateMedicao = async (id, payload) =>
  runQuery(
    supabase
      .from('medicoes')
      .update({ ...payload, updated_at: nowUtcIso() })
      .eq('id', id)
      .select(MEDICAO_SELECT_COLUMNS)
      .single(),
    'medicoes.update'
  );

export const deleteMedicao = async (id) =>
  runQuery(
    supabase
      .from('medicoes')
      .update({ deleted_at: nowUtcIso(), updated_at: nowUtcIso() })
      .eq('id', id),
    'medicoes.softDelete'
  );

export async function canCreateMedicao({ equipamento_id, user_id }) {
  const equipamentoRows = await runQuery(
    supabase.from('equipamentos').select('id').eq('id', equipamento_id).is('deleted_at', null).limit(1),
    'medicoes.checkEquipamento'
  );

  if (!equipamentoRows?.length) return false;
  if (state.role === 'ADMIN') return true;

  const vinculos = await runQuery(
    supabase
      .from('vinculos')
      .select('id')
      .eq('equipamento_id', equipamento_id)
      .eq('user_id', user_id)
      .eq('status', 'ATIVO')
      .is('deleted_at', null)
      .limit(1),
    'medicoes.checkVinculo'
  );

  return vinculos?.length > 0;
}
