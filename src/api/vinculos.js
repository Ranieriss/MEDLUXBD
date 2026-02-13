import { supabase, runQuery, getSignedFileUrl } from '../supabaseClient.js';
import { VINCULO_SELECT_COLUMNS } from './selectColumns.js';
import { nowUtcIso } from '../shared_datetime.js';
import { state } from '../state.js';

function baseVinculosQuery() {
  return supabase.from('vinculos').select(VINCULO_SELECT_COLUMNS).order('created_at', { ascending: false });
}

export async function listVinculos() {
  return runQuery(baseVinculosQuery(), 'vinculos.list');
}

export async function hasActiveVinculoByEquipamento(equipamento_id, excludedId = null) {
  let query = supabase.from('vinculos').select('id,status').eq('equipamento_id', equipamento_id).eq('status', 'ATIVO');
  if (excludedId) query = query.neq('id', excludedId);
  const rows = await runQuery(query.limit(1), 'vinculos.activeCheck');
  return rows?.length > 0;
}

async function assertNoDuplicateActiveVinculo(payload, excludedId = null) {
  if (String(payload?.status || '').toUpperCase() !== 'ATIVO') return;
  if (await hasActiveVinculoByEquipamento(payload.equipamento_id, excludedId)) {
    const err = new Error('Já existe vínculo ATIVO para este equipamento.');
    err.code = 'INTEGRITY_ACTIVE_VINCULO_DUPLICATE';
    throw err;
  }
}

export async function createVinculo(payload) {
  await assertNoDuplicateActiveVinculo(payload);
  return runQuery(
    supabase.from('vinculos').insert({ ...payload, created_at: payload.created_at || nowUtcIso() }).select(VINCULO_SELECT_COLUMNS).single(),
    'vinculos.create'
  );
}

export async function updateVinculo(id, payload) {
  await assertNoDuplicateActiveVinculo(payload, id);
  return runQuery(
    supabase.from('vinculos').update({ ...payload, updated_at: nowUtcIso() }).eq('id', id).select(VINCULO_SELECT_COLUMNS).single(),
    'vinculos.update'
  );
}

export const deleteVinculo = (id) => runQuery(supabase.from('vinculos').delete().eq('id', id), 'vinculos.delete');

export const encerrarVinculo = (id, motivo = '') =>
  runQuery(
    supabase
      .from('vinculos')
      .update({
        encerrou_em: nowUtcIso(),
        status: 'ENCERRADO',
        encerrado_por: state.user?.email || state.user?.id || 'unknown',
        motivo_encerramento: motivo || null,
        updated_at: nowUtcIso()
      })
      .eq('id', id)
      .select(VINCULO_SELECT_COLUMNS)
      .single(),
    'vinculos.encerrar'
  );

export const getVinculoFileUrl = (path) => getSignedFileUrl(path, 600);
