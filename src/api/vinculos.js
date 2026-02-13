import { supabase, runQuery, getSignedFileUrl } from '../supabaseClient.js';
import { VINCULO_SELECT_COLUMNS } from './selectColumns.js';
import { nowUtcIso } from '../shared_datetime.js';
import { state } from '../state.js';
import { getCurrentOrgId } from './org.js';

const VINCULO_LEGACY_COLUMNS =
  'id,equipamento_id,obra_id,user_id,inicio_em,status,termo_url,termo_nome,motivo_encerramento,encerrou_em,encerrado_por,created_at,updated_at';

function baseVinculosQuery(includeDeleted = false) {
  let query = supabase
    .from('vinculos')
    .select(VINCULO_SELECT_COLUMNS)
    .order('created_at', { ascending: false });

  if (!includeDeleted) query = query.is('deleted_at', null);

  return query;
}

}

export async function listVinculos({ includeDeleted = false } = {}) {
  try {
    return await runQuery(baseVinculosQuery(includeDeleted), 'vinculos.list');
  } catch (error) {
    if (String(error?.code) !== '42703') throw error;
    return runQuery(supabase.from('vinculos').select(VINCULO_LEGACY_COLUMNS).order('created_at', { ascending: false }), 'vinculos.listLegacy');
  }
}

export async function hasActiveVinculoByEquipamento(equipamento_id, excludedId = null) {
  let query = applyOrganizationFilter(
    supabase
      .from('vinculos')
      .select('id,status')
      .eq('equipamento_id', equipamento_id)
      .eq('status', 'ATIVO'),
    'vinculos.activeCheck'
  );

  if (excludedId) query = query.neq('id', excludedId);

  const rows = await runQuery(query.limit(1), 'vinculos.activeCheck');
  return rows?.length > 0;
}

async function assertNoDuplicateActiveVinculo(payload, excludedId = null) {
  if (String(payload?.status || '').toUpperCase() !== 'ATIVO') return;
  if (await hasActiveVinculoByEquipamento(payload.equipamento_id, excludedId)) {
    const err = new Error('Já existe vínculo ATIVO para este equipamento.');
    err.code = 'INTEGRITY_ACTIVE_VINCULO_DUPLICATE';
    throw err;
  }
}

export const createVinculo = async (payload) => {
  await assertNoDuplicateActiveVinculo(payload);
  return runQuery(
    supabase
      .from('vinculos')
      .insert({ ...payload, created_at: payload.created_at || nowUtcIso() })
      .select(VINCULO_SELECT_COLUMNS)
      .single(),
    'vinculos.create'
  );
};

export const updateVinculo = async (id, payload) => {
  await assertNoDuplicateActiveVinculo(payload, id);
  return runQuery(
    supabase
      .from('vinculos')
      .update({ ...payload, updated_at: nowUtcIso() })
      .eq('id', id)
      .select(VINCULO_SELECT_COLUMNS)
      .single(),
    'vinculos.update'
  );
};

export const deleteVinculo = async (id) => {
  try {
    // soft delete (preferido)
    return await runQuery(
      supabase
        .from('vinculos')
        .update({ status: 'ENCERRADO', deleted_at: nowUtcIso(), updated_at: nowUtcIso() })
        .eq('id', id),
      'vinculos.softDelete'
    );
  } catch (error) {
    // 42703 = deleted_at não existe (legacy)
    if (String(error?.code) !== '42703') throw error;
    return runQuery(
      supabase.from('vinculos').delete().eq('id', id),
      'vinculos.deleteLegacy'
    );
  }
};

export const encerrarVinculo = async (id, motivo = '') =>
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
      .eq('id', id),
    'vinculos.encerrar'
  );

      .select(VINCULO_SELECT_COLUMNS)
      .single(),
    'vinculos.encerrar'
  );
};

export const getVinculoFileUrl = (path) => getSignedFileUrl(path, 600);
