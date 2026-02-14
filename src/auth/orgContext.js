import { supabase } from '../supabaseClient.js';

let orgContextPromise = null;
let orgContextUserId = null;
let orgContextReady = false;

function isDevMode() {
  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
}

function devInfo(message, payload = null) {
  if (!isDevMode()) return;
  if (payload) {
    console.info(`[MEDLUXBD][org] ${message}`, payload);
    return;
  }
  console.info(`[MEDLUXBD][org] ${message}`);
}

export function resetOrgContext() {
  orgContextPromise = null;
  orgContextUserId = null;
  orgContextReady = false;
}

export async function ensureOrgContext(user = null) {
  const { data: userData } = await supabase.auth.getUser();
  const currentUser = user || userData?.user || null;

  if (!currentUser?.id) {
    resetOrgContext();
    return { organizationId: null, role: null, skipped: true };
  }

  if (orgContextReady && orgContextUserId === currentUser.id) {
    return { organizationId: null, role: null, skipped: true };
  }

  if (orgContextPromise && orgContextUserId === currentUser.id) {
    return orgContextPromise;
  }

  orgContextUserId = currentUser.id;

  orgContextPromise = (async () => {
    devInfo('Usuário autenticado', {
      userId: currentUser.id,
      email: currentUser.email || null
    });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', currentUser.id)
      .single();

    if (profileError) {
      throw new Error('Erro ao carregar perfil do usuário.');
    }

    const organizationId = profile?.organization_id || null;
    const role = profile?.role || 'USER';

    devInfo('Perfil carregado', { organizationId, role });

    if (!organizationId) {
      if (role === 'ADMIN') {
        orgContextReady = true;
        return { organizationId: null, role, skipped: true };
      }

      throw new Error(
        'Usuário não vinculado a uma organização. Configure organization_id no profile.'
      );
    }

    const { error: rpcError } = await supabase.rpc('set_current_org', {
      org_id: organizationId
    });

    if (rpcError) {
      throw new Error('Erro ao executar RPC set_current_org.');
    }

    devInfo('Contexto de organização aplicado via RPC', {
      organizationId
    });

    orgContextReady = true;

    return { organizationId, role, skipped: false };
  })();

  try {
    return await orgContextPromise;
  } catch (error) {
    resetOrgContext();
    throw error;
  }
}
