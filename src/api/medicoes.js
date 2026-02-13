import { supabase, runQuery } from '../supabaseClient.js';
import { MEDICAO_SELECT_COLUMNS } from './selectColumns.js';
import { nowUtcIso } from '../shared_datetime.js';
import { state } from '../state.js';
import { applyOrganizationFilter, withOrganization } from '../tenant.js';

export async function listMedicoes(filters = {}) {
  let q = applyOrganizationFilter(
    supabase.from('medicoes').select(MEDICAO_SELECT_COLUMNS).order('medido_em', { ascending: false }),
    'medicoes.list'
  );
  if (filters.obra_id) q = q.eq('obra_id', filters.obra_id);
  if (filters.equipamento_id) q = q.eq('equipamento_id', filters.equipamento_id);
  return runQuery(q, 'medicoes.list');
}

export const createMedicao = (payload) => runQuery(
  supabase
    .from('medicoes')
    .insert(withOrganization({ ...payload, created_at: payload.created_at || nowUtcIso() }, 'medicoes.create'))
    .select(MEDICAO_SELECT_COLUMNS)
    .single(),
  'medicoes.create'
);

export const updateMedicao = (id, payload) => runQuery(
  applyOrganizationFilter(supabase.from('medicoes').update({ ...payload, updated_at: nowUtcIso() }).eq('id', id), 'medicoes.update')
    .select(MEDICAO_SELECT_COLUMNS)
    .single(),
  'medicoes.update'
);

export const deleteMedicao = (id) => runQuery(
  applyOrganizationFilter(supabase.from('medicoes').delete().eq('id', id), 'medicoes.delete'),
  'medicoes.delete'
);

export async function canCreateMedicao({ equipamento_id, user_id }) {
  const equipamentoRows = await runQuery(
    applyOrganizationFilter(supabase.from('equipamentos').select('id').eq('id', equipamento_id).limit(1), 'medicoes.checkEquipamento'),
    'medicoes.checkEquipamento'
  );
  if (!equipamentoRows?.length) return false;
  if (state.role === 'ADMIN') return true;

  const vinculos = await runQuery(
    applyOrganizationFilter(
      supabase.from('vinculos').select('id').eq('equipamento_id', equipamento_id).eq('user_id', user_id).eq('status', 'ATIVO').limit(1),
      'medicoes.checkVinculo'
    ),
    'medicoes.checkVinculo'
  );
  return vinculos?.length > 0;
}
