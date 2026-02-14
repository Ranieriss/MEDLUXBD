import { supabase } from '../supabaseClient.js';

let orgContextInitialized = false;

/**
 * Reseta o contexto da organização
 */
export function resetOrgContext() {
  orgContextInitialized = false;
}

/**
 * Garante que o contexto da organização está definido
 */
export async function ensureOrgContext(user = null) {
  try {
    const {
      data: { user: currentUser }
    } = user
      ? { data: { user } }
      : await supabase.auth.getUser();

    if (!currentUser?.id) {
      return { organizationId: null, role: null, skipped: true };
    }

    // Evita rodar múltiplas vezes
    if (orgContextInitialized) {
      return { organizationId: null, role: null, skipped: true };
    }

    // Busca perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', currentUser.id)
      .single();

    if (profileError) {
      console.error('Erro ao buscar profile:', profileError);
      throw profileError;
    }

    const organizationId = profile?.organization_id || null;
    const role = profile?.role || 'USER';

    // ADMIN sem organização não trava sistema
    if (!organizationId) {
      if (role === 'ADMIN') {
        orgContextInitialized = true;
        return { organizationId: null, role, skipped: true };
      }

      throw new Error(
        'Usuário sem organization_id definido. Fale com o administrador.'
      );
    }

    // Chama RPC para setar organização atual
    const { error: rpcError } = await supabase.rpc('set_current_org', {
      org_id: organizationId
    });

    if (rpcError) {
      console.error('Erro RPC set_current_org:', rpcError);
      throw rpcError;
    }

    orgContextInitialized = true;

    return { organizationId, role, skipped: false };
  } catch (err) {
    console.error('Erro ensureOrgContext:', err);
    resetOrgContext();
    throw err;
  }
}
