import { supabase, runQuery } from '../supabaseClient.js';
import { isAdmin, state } from '../state.js';

const EQUIPAMENTO_COLUMNS = 'id,codigo,nome,modelo,status,created_at';

async function listEquipamentosFromIds(ids) {
  return runQuery(
    supabase.from('equipamentos').select(EQUIPAMENTO_COLUMNS).in('id', ids).order('created_at', { ascending: false }),
    'equipamentos.list.restricted'
  );
}

export async function listEquipamentos() {
  if (isAdmin()) {
    return runQuery(
      supabase.from('equipamentos').select(EQUIPAMENTO_COLUMNS).order('created_at', { ascending: false }),
      'equipamentos.list'
    );
  }

  const vinculos = await runQuery(
    supabase.from('vinculos').select('equipamento_id,encerrou_em').eq('user_id', state.user.id).is('encerrou_em', null),
    'equipamentos.list.vinculos'
  );
  const ids = [...new Set(vinculos.map((v) => v.equipamento_id).filter(Boolean))];
  if (!ids.length) return [];
  return listEquipamentosFromIds(ids);
}

export const createEquipamento = (payload) => runQuery(
  supabase.from('equipamentos').insert(payload).select(EQUIPAMENTO_COLUMNS).single(),
  'equipamentos.create'
);

export const updateEquipamento = (id, payload) => runQuery(
  supabase.from('equipamentos').update(payload).eq('id', id).select(EQUIPAMENTO_COLUMNS).single(),
  'equipamentos.update'
);

export const deleteEquipamento = (id) => runQuery(supabase.from('equipamentos').delete().eq('id', id), 'equipamentos.delete');
