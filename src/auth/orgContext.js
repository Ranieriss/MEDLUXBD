import { supabase } from '../supabaseClient.js';

let orgInitialized = false;
let currentUserId = null;

export async function resetOrgContext() {
  orgInitialized = false;
  currentUserId = null;
}

export async function ensureOrgContext() {
  // 1️⃣ Garantir que o usuário já está autenticado
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) throw userError;

  if (!user) {
    resetOrgContext();
    return { organizationId: null, role: null };
  }

  // Evita rodar duas vezes para o mesmo usuário
  if (orgInitialized && currentUserId === user.id) {
    return;
  }

  currentUserId = user.id;

  // 2️⃣ Buscar profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (profileError) throw profileError;

  if (!profile?.organization_id) {
    if (profile?.role === 'ADMIN') {
      orgInitialized = true;
      return;
    }

    throw new Error(
      'Usuário não possui organization_id definido. Contate o administrador.'
    );
  }

  // 3️⃣ IMPORTANTE: aguardar RPC finalizar
  const { error: rpcError } = await supabase.rpc('set_current_org', {
    org_id: profile.organization_id
  });

  if (rpcError) throw rpcError;

  orgInitialized = true;

  console.log('✅ Contexto da organização definido:', profile.organization_id);

  return {
    organizationId: profile.organization_id,
    role: profile.role
  };
}
