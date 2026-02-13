import { supabase, runQuery } from '../supabaseClient.js';
import { EQUIPAMENTO_SELECT_COLUMNS } from './selectColumns.js';

export async function listEquipamentos() {
  return runQuery(
    supabase.from('equipamentos').select(EQUIPAMENTO_SELECT_COLUMNS).order('created_at', { ascending: false }),
    'equipamentos.list'
  );
}

export const createEquipamento = (payload) => runQuery(
  supabase.from('equipamentos').insert(payload).select(EQUIPAMENTO_SELECT_COLUMNS).single(),
  'equipamentos.create'
);

export const updateEquipamento = (id, payload) => runQuery(
  supabase.from('equipamentos').update(payload).eq('id', id).select(EQUIPAMENTO_SELECT_COLUMNS).single(),
  'equipamentos.update'
);

export const deleteEquipamento = (id) => runQuery(supabase.from('equipamentos').delete().eq('id', id), 'equipamentos.delete');
