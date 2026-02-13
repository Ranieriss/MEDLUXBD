import { supabase, runQuery, getSignedFileUrl } from '../supabaseClient.js';
import { VINCULO_SELECT_COLUMNS } from './selectColumns.js';

function baseVinculosQuery() {
  return supabase.from('vinculos').select(VINCULO_SELECT_COLUMNS).order('created_at', { ascending: false });
}

export async function listVinculos() {
  return runQuery(baseVinculosQuery(), 'vinculos.list');
}

export const createVinculo = (payload) => runQuery(
  supabase.from('vinculos').insert(payload).select(VINCULO_SELECT_COLUMNS).single(),
  'vinculos.create'
);

export const updateVinculo = (id, payload) => runQuery(
  supabase.from('vinculos').update(payload).eq('id', id).select(VINCULO_SELECT_COLUMNS).single(),
  'vinculos.update'
);

export const deleteVinculo = (id) => runQuery(supabase.from('vinculos').delete().eq('id', id), 'vinculos.delete');

export const encerrarVinculo = (id) =>
  runQuery(
    supabase.from('vinculos').update({ encerrou_em: new Date().toISOString(), status: 'ENCERRADO' }).eq('id', id).select(VINCULO_SELECT_COLUMNS).single(),
    'vinculos.encerrar'
  );

export const getVinculoFileUrl = (path) => getSignedFileUrl(path, 600);
