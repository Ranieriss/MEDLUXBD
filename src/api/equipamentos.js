import { supabase, runQuery } from '../supabaseClient.js';
import { EQUIPAMENTO_SELECT_COLUMNS } from './selectColumns.js';
import { nowUtcIso } from '../shared_datetime.js';
const EQUIPAMENTO_LEGACY_COLUMNS = 'id,codigo,nome,modelo,tipo,status,created_at,updated_at';

export async function listEquipamentos({ includeDeleted = false } = {}) {
  try {
    let query = supabase
      .from('equipamentos')
      .select(EQUIPAMENTO_SELECT_COLUMNS)
      .order('created_at', { ascending: false });

    // Soft delete (se existir a coluna deleted_at)
    if (!includeDeleted) query = query.is('deleted_at', null);

    return await runQuery(query, 'equipamentos.list');
  } catch (error) {
    // 42703 = coluna não existe (legacy)
    if (String(error?.code) !== '42703') throw error;

    return runQuery(
      supabase
        .from('equipamentos')
        .select(EQUIPAMENTO_LEGACY_COLUMNS)
        .order('created_at', { ascending: false }),
      'equipamentos.listLegacy'
    );
  }
}

export const createEquipamento = async (payload) => {
  return runQuery(
    supabase
      .from('equipamentos')
      .insert({ ...payload, created_at: payload.created_at || nowUtcIso() })
      .select(EQUIPAMENTO_SELECT_COLUMNS)
      .single(),
    'equipamentos.create'
  );
};

export const updateEquipamento = async (id, payload) => {
  return runQuery(
    supabase
      .from('equipamentos')
      .update({ ...payload, updated_at: nowUtcIso() })
      .eq('id', id)
      .select(EQUIPAMENTO_SELECT_COLUMNS)
      .single(),
    'equipamentos.update'
  );
};

export const deleteEquipamento = async (id) => {
  try {
    // Soft delete com deleted_at (quando existir)
    return await runQuery(
      supabase
        .from('equipamentos')
        .update({ status: 'INATIVO', deleted_at: nowUtcIso(), updated_at: nowUtcIso() })
        .eq('id', id),
      'equipamentos.softDelete'
    );
  } catch (error) {
    // fallback legacy (sem deleted_at)
    if (String(error?.code) !== '42703') throw error;

    return runQuery(
      supabase
        .from('equipamentos')
        .update({ status: 'INATIVO', updated_at: nowUtcIso() })
        .eq('id', id),
      'equipamentos.softDeleteLegacy'
    );
  }
};


export async function hasEquipamentoDependencies(id) {
  const [medicoes, vinculos] = await Promise.all([
runQuery(
  applyOrganizationFilter(
    supabase
      .from('medicoes')
      .select('id')
      .eq('equipamento_id', id)
      .limit(1),
    'equipamentos.dep.medicoes'
  ),
  'equipamentos.dep.medicoes'
),

runQuery(
  applyOrganizationFilter(
    supabase
      .from('vinculos')
      .select('id')
      .eq('equipamento_id', id)
      .eq('status', 'ATIVO')
      .limit(1),
    'equipamentos.dep.vinculosAtivos'
  ),
  'equipamentos.dep.vinculosAtivos'
)

  ]);
  return (medicoes?.length || 0) > 0 || (vinculos?.length || 0) > 0;
}
