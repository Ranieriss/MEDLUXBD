import { supabase, runQuery } from '../supabaseClient.js';
import { OBRA_SELECT_COLUMNS } from './selectColumns.js';
import { nowUtcIso } from '../shared_datetime.js';
import { getCurrentOrgId } from './org.js';

const OBRA_LEGACY_COLUMNS = 'id,codigo,nome,local,status,created_at,updated_at';

export async function listObras({ includeDeleted = false } = {}) {
  try {
    let query = supabase.from('obras').select(OBRA_SELECT_COLUMNS).order('created_at', { ascending: false });
    if (!includeDeleted) query = query.is('deleted_at', null);
    return await runQuery(query, 'obras.list');
  } catch (error) {
    if (String(error?.code) !== '42703') throw error;
    return runQuery(supabase.from('obras').select(OBRA_LEGACY_COLUMNS).order('created_at', { ascending: false }), 'obras.listLegacy');
  }
}

export const createObra = async (payload) => {
  const organization_id = await getCurrentOrgId();
  return runQuery(
    supabase.from('obras').insert({ ...payload, organization_id, created_at: payload.created_at || nowUtcIso() }).select(OBRA_SELECT_COLUMNS).single(),
    'obras.create'
  );
};

export const updateObra = async (id, payload) => {
  const organization_id = await getCurrentOrgId();
  return runQuery(
    supabase.from('obras').update({ ...payload, organization_id, updated_at: nowUtcIso() }).eq('id', id).select(OBRA_SELECT_COLUMNS).single(),
    'obras.update'
  );
};

export const deleteObra = async (id) => {
  try {
    return await runQuery(
      supabase.from('obras').update({ status: 'INATIVA', deleted_at: nowUtcIso(), updated_at: nowUtcIso() }).eq('id', id),
      'obras.softDelete'
    );
  } catch (error) {
    if (String(error?.code) !== '42703') throw error;
    return runQuery(supabase.from('obras').update({ status: 'INATIVA', updated_at: nowUtcIso() }).eq('id', id), 'obras.softDeleteLegacy');
  }
};

export async function hasObraDependencies(id) {
  const [medicoes, vinculos] = await Promise.all([
    runQuery(supabase.from('medicoes').select('id').eq('obra_id', id).limit(1), 'obras.dep.medicoes'),
    runQuery(supabase.from('vinculos').select('id').eq('obra_id', id).limit(1), 'obras.dep.vinculos')
  ]);
  return (medicoes?.length || 0) > 0 || (vinculos?.length || 0) > 0;
}
