import { supabase, runQuery } from '../supabaseClient.js';
import { EQUIPAMENTO_SELECT_COLUMNS } from './selectColumns.js';
import { nowUtcIso } from '../shared_datetime.js';
import { applyOrganizationFilter, withOrganization } from '../tenant.js';

export async function listEquipamentos() {
  return runQuery(
    applyOrganizationFilter(
      supabase.from('equipamentos').select(EQUIPAMENTO_SELECT_COLUMNS).order('created_at', { ascending: false }),
      'equipamentos.list'
    ),
    'equipamentos.list'
  );
}

export const createEquipamento = (payload) => runQuery(
  supabase
    .from('equipamentos')
    .insert(withOrganization({ ...payload, created_at: payload.created_at || nowUtcIso() }, 'equipamentos.create'))
    .select(EQUIPAMENTO_SELECT_COLUMNS)
    .single(),
  'equipamentos.create'
);

export const updateEquipamento = (id, payload) => runQuery(
  applyOrganizationFilter(
    supabase.from('equipamentos').update({ ...payload, updated_at: nowUtcIso() }).eq('id', id),
    'equipamentos.update'
  )
    .select(EQUIPAMENTO_SELECT_COLUMNS)
    .single(),
  'equipamentos.update'
);

export const deleteEquipamento = (id) => runQuery(
  applyOrganizationFilter(
    supabase.from('equipamentos').update({ status: 'INATIVO', updated_at: nowUtcIso() }).eq('id', id),
    'equipamentos.softDelete'
  ),
  'equipamentos.softDelete'
);

export async function hasEquipamentoDependencies(id) {
  const [medicoes, vinculos] = await Promise.all([
runQuery(
  applyOrganizationFilter(
    supabase
      .from('medicoes')
      .select('id')
      .eq('equipamento_id', id)
      .limit(1),
    'equipamentos.dep.medicoes'
  ),
  'equipamentos.dep.medicoes'
),

runQuery(
  applyOrganizationFilter(
    supabase
      .from('vinculos')
      .select('id')
      .eq('equipamento_id', id)
      .eq('status', 'ATIVO')
      .limit(1),
    'equipamentos.dep.vinculosAtivos'
  ),
  'equipamentos.dep.vinculosAtivos'
)

  ]);
  return (medicoes?.length || 0) > 0 || (vinculos?.length || 0) > 0;
}
