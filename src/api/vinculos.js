import { supabase, runQuery, toFriendlyErrorMessage, getSignedFileUrl } from '../supabaseClient.js';
import { isAdmin, state } from '../state.js';

const VINCULO_COLUMNS = 'id,equipamento_id,obra_id,user_id,data_entrega,status,termo_path,encerrou_em,created_at,updated_at,equipamento:equipamentos!left(id,codigo,nome),obra:obras!left(id,codigo,nome)';

function baseVinculosQuery() {
  return supabase.from('vinculos').select(VINCULO_COLUMNS).order('created_at', { ascending: false });
}

export async function listVinculos() {
  let q = baseVinculosQuery();
  if (!isAdmin()) q = q.eq('user_id', state.user.id);

  try {
    return await runQuery(q, 'vinculos.list');
  } catch (error) {
    if (String(error?.code) === '42703') {
      // fallback defensivo para bases antigas sem encerrou_em
      const fallbackColumns = 'id,equipamento_id,obra_id,user_id,data_entrega,status,termo_path,created_at,updated_at,equipamento:equipamentos!left(id,codigo,nome),obra:obras!left(id,codigo,nome)';
      let fallback = supabase.from('vinculos').select(fallbackColumns).order('created_at', { ascending: false });
      if (!isAdmin()) fallback = fallback.eq('user_id', state.user.id);
      return runQuery(fallback, 'vinculos.list.fallbackNoEncerrouEm');
    }
    throw new Error(toFriendlyErrorMessage(error));
  }
}

export const createVinculo = (payload) => runQuery(
  supabase.from('vinculos').insert(payload).select(VINCULO_COLUMNS).single(),
  'vinculos.create'
);

export const updateVinculo = (id, payload) => runQuery(
  supabase.from('vinculos').update(payload).eq('id', id).select(VINCULO_COLUMNS).single(),
  'vinculos.update'
);

export const deleteVinculo = (id) => runQuery(supabase.from('vinculos').delete().eq('id', id), 'vinculos.delete');

export const encerrarVinculo = (id) =>
  runQuery(
    supabase.from('vinculos').update({ encerrou_em: new Date().toISOString(), status: 'ENCERRADO' }).eq('id', id).select(VINCULO_COLUMNS).single(),
    'vinculos.encerrar'
  );

export const getVinculoFileUrl = (path) => getSignedFileUrl(path, 600);
