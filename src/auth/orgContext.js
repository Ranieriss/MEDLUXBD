// src/auth/orgContext.js
import { supabase } from "../supabaseClient.js";

let orgContextPromise = null;
let orgContextUserId = null;
let orgContextReady = false;

// Cache real para não devolver null quando já está pronto
let cachedOrgId = null;
let cachedRole = null;

function isDevMode() {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
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

  cachedOrgId = null;
  cachedRole = null;
}

/**
 * Garante que o contexto da organização foi definido (RLS)
 * - Busca organization_id e role em profiles
 * - Chama RPC set_current_org(org_id)
 * - Faz cache do orgId e role para evitar rework
 */
export async function ensureOrgContext(user = null) {
  // Preferir getSession() para estabilidade (token persistido)
  const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
  if (sessErr) {
    devInfo("getSession erro", { message: sessErr.message });
  }

  const currentUser = user || sessionData?.session?.user || null;

  if (!currentUser?.id) {
    resetOrgContext();
    return { organizationId: null, role: null, skipped: true };
  }

  // Se já está pronto para este usuário, devolve o cache (não null)
  if (orgContextReady && orgContextUserId === currentUser.id) {
    return { organizationId: cachedOrgId, role: cachedRole, skipped: true };
  }

  // Se já está em andamento para este usuário, reaproveita a promise
  if (orgContextPromise && orgContextUserId === currentUser.id) {
    return orgContextPromise;
  }

  orgContextUserId = currentUser.id;

  orgContextPromise = (async () => {
    devInfo("Login ok", { userId: currentUser.id, email: currentUser.email || null });

    // 1) pega organization_id e role do profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id,role")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profileError) throw profileError;

    const organizationId = profile?.organization_id || null;
    const role = profile?.role || "USER";

    cachedOrgId = organizationId;
    cachedRole = role;

    devInfo("Org carregada", { organizationId, role });

    // 2) regra: ADMIN pode operar sem org (mas cuidado: RLS precisa permitir)
    if (!organizationId) {
      if (role === "ADMIN") {
        orgContextReady = true;
        devInfo("ADMIN sem org: skip set_current_org", { role });
        return { organizationId: null, role, skipped: true };
      }

      throw new Error(
        "Seu usuário não está vinculado a uma organização. Fale com o administrador para configurar seu organization_id."
      );
    }

    // 3) chama RPC para setar contexto (app.current_org)
    // IMPORTANTE: essa RPC tem que existir no Supabase e estar GRANT para authenticated
    const { error: rpcError } = await supabase.rpc("set_current_org", { org_id: organizationId });
    if (rpcError) throw rpcError;

    orgContextReady = true;
    devInfo("RPC set_current_org ok", { organizationId });

    return { organizationId, role, skipped: false };
  })();

  try {
    return await orgContextPromise;
  } catch (error) {
    resetOrgContext();
    throw error;
  }
}
