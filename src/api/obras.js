import { supabase, runQuery } from '../supabaseClient.js';
import { OBRA_SELECT_COLUMNS } from './selectColumns.js';
import { nowUtcIso } from '../shared_datetime.js';
import { applyOrganizationFilter, withOrganization } from '../tenant.js';

export async function listObras() {
  return runQuery(
    applyOrganizationFilter(supabase.from('obras').select(OBRA_SELECT_COLUMNS).order('created_at', { ascending: false }), 'obras.list'),
    'obras.list'
  );
}

export const createObra = (payload) => runQuery(
  supabase
    .from('obras')
    .insert(withOrganization({ ...payload, created_at: payload.created_at || nowUtcIso() }, 'obras.create'))
    .select(OBRA_SELECT_COLUMNS)
    .single(),
  'obras.create'
);

export const updateObra = (id, payload) => runQuery(
  applyOrganizationFilter(supabase.from('obras').update({ ...payload, updated_at: nowUtcIso() }).eq('id', id), 'obras.update')
    .select(OBRA_SELECT_COLUMNS)
    .single(),
  'obras.update'
);

export const deleteObra = (id) => runQuery(
  applyOrganizationFilter(supabase.from('obras').update({ status: 'INATIVA', updated_at: nowUtcIso() }).eq('id', id), 'obras.softDelete'),
  'obras.softDelete'
);
