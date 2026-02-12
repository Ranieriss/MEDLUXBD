import { supabase, runQuery, getSignedFileUrl } from '../supabaseClient.js';
import { isAdmin, state } from '../state.js';

export async function listVinculos() {
  let q = supabase.from('vinculos').select('*').order('created_at', { ascending: false });
  if (!isAdmin()) q = q.eq('user_id', state.user.id);
  return runQuery(q, 'vinculos.list');
}

export const createVinculo = (payload) => runQuery(supabase.from('vinculos').insert(payload).select().single(), 'vinculos.create');
export const updateVinculo = (id, payload) => runQuery(supabase.from('vinculos').update(payload).eq('id', id).select().single(), 'vinculos.update');
export const deleteVinculo = (id) => runQuery(supabase.from('vinculos').delete().eq('id', id), 'vinculos.delete');
export const encerrarVinculo = (id) =>
  runQuery(
    supabase.from('vinculos').update({ encerrou_em: new Date().toISOString(), status: 'ENCERRADO' }).eq('id', id).select().single(),
    'vinculos.encerrar'
  );

export const getVinculoFileUrl = (path) => getSignedFileUrl(path, 600);
