export const SUPABASE_URL = 'https://gcmhgyjjinqafbdmuaqy.supabase.co';

// Cole aqui sua chave pública completa (sb_publishable_...).
// NUNCA use chaves secret (sb_secret) ou service_role no frontend.
// Utilize apenas a chave pública (anon ou publishable) no cliente.

export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_JKtypI8V_ussH5TRL0Rqng_tU324Xk-';

// Compatibilidade com nomes antigos.
// Source of truth: SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY.
export const supabaseUrl = SUPABASE_URL;
export const supabaseAnonKey = SUPABASE_PUBLISHABLE_KEY;

const PLACEHOLDER_TOKENS = ['YOUR_', 'REPLACE_', 'CHANGE_ME', 'EXAMPLE', 'COLE_AQUI'];

export const SUPABASE_KEY_SETUP_HINT =
  'Abra src/config.js e cole a Publishable key COMPLETA do Supabase (Settings → API Keys → Publishable key).';

function normalizeValue(value) {
  return String(value || '').trim();
}

function isUnset(value) {
  const normalized = normalizeValue(value);
  if (!normalized) return true;
  return PLACEHOLDER_TOKENS.some((token) => normalized.toUpperCase().includes(token));
}

function isValidSupabaseUrl(value) {
  const normalized = normalizeValue(value);
  return normalized.startsWith('https://');
}

function isValidSupabaseKey(value) {
  const normalized = normalizeValue(value);
  return normalized.startsWith('sb_publishable_');
}

export function validateSupabaseConfig() {
  const missing = [];

  if (isUnset(SUPABASE_URL)) {
    missing.push('SUPABASE_URL');
  } else if (!isValidSupabaseUrl(SUPABASE_URL)) {
    return 'SUPABASE_URL inválida. Use uma URL https:// do seu projeto Supabase em src/config.js.';
  }

  if (isUnset(SUPABASE_PUBLISHABLE_KEY) || !isValidSupabaseKey(SUPABASE_PUBLISHABLE_KEY)) {
    missing.push('SUPABASE_PUBLISHABLE_KEY');
  }

  if (!missing.length) return null;

  if (missing.length === 1 && missing[0] === 'SUPABASE_URL') {
    return 'Falta configurar SUPABASE_URL em src/config.js.';
  }

  if (missing.length === 1 && missing[0] === 'SUPABASE_PUBLISHABLE_KEY') {
    return `Falta configurar SUPABASE_PUBLISHABLE_KEY em src/config.js. ${SUPABASE_KEY_SETUP_HINT}`;
  }

  return `Falta configurar SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY em src/config.js. ${SUPABASE_KEY_SETUP_HINT}`;
}

export function mapSupabaseKeyErrorMessage(error) {
  const message = normalizeValue(error?.message || error).toLowerCase();
  if (!message) return null;

  if (message.includes('invalid api key') || message.includes('invalid authentication credentials')) {
    return SUPABASE_KEY_SETUP_HINT;
  }

  if (message.includes('sb_secret')) {
    return 'Chave inválida no frontend. Use apenas SUPABASE_PUBLISHABLE_KEY (sb_publishable_...) em src/config.js.';
  }

  return null;
}
