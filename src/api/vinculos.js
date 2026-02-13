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

export async function hasActiveVinculoByEquipamento(equipamento_id) {
  const rows = await runQuery(
    supabase.from('vinculos').select('id,status').eq('equipamento_id', equipamento_id).eq('status', 'ATIVO').limit(1),
    'vinculos.activeCheck'
  );
  return rows?.length > 0;
}

export const createVinculo = (payload) => runQuery(
  supabase.from('vinculos').insert({ ...payload, created_at: payload.created_at || nowUtcIso() }).select(VINCULO_SELECT_COLUMNS).single(),
  'vinculos.create'
);

export const updateVinculo = (id, payload) => runQuery(
  supabase.from('vinculos').update({ ...payload, updated_at: nowUtcIso() }).eq('id', id).select(VINCULO_SELECT_COLUMNS).single(),
  'vinculos.update'
);

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
