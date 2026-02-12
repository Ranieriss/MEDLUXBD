import { supabase, runQuery } from '../supabaseClient.js';
import { isAdmin, state } from '../state.js';

export async function listEquipamentos() {
  if (isAdmin()) {
    return runQuery(supabase.from('equipamentos').select('*').order('created_at', { ascending: false }), 'equipamentos.list');
  }
  const vinculos = await runQuery(
    supabase.from('vinculos').select('equipamento_id').eq('user_id', state.user.id).is('encerrou_em', null),
    'equipamentos.list.vinculos'
  );
  const ids = [...new Set(vinculos.map((v) => v.equipamento_id).filter(Boolean))];
  if (!ids.length) return [];
  return runQuery(supabase.from('equipamentos').select('*').in('id', ids), 'equipamentos.list.restricted');
}

export const createEquipamento = (payload) => runQuery(supabase.from('equipamentos').insert(payload).select().single(), 'equipamentos.create');
export const updateEquipamento = (id, payload) => runQuery(supabase.from('equipamentos').update(payload).eq('id', id).select().single(), 'equipamentos.update');
export const deleteEquipamento = (id) => runQuery(supabase.from('equipamentos').delete().eq('id', id), 'equipamentos.delete');
