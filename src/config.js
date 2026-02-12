export const SUPABASE_URL = 'https://gcmhgyjjinqafbdmuaqy.supabase.co';

// Cole aqui sua chave pública completa (sb_publishable_...).
// NUNCA use uma chave sb_secret ou service_role no frontend.
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
  if (!normalized) return false;

  // Formato atual recomendado.
  if (normalized.startsWith('sb_publishable_')) return true;

  // Compatibilidade com chave legada "anon" (JWT com 3 partes).
  if (normalized.split('.').length === 3) return true;

  return false;
}

function isLikelyTruncatedPublishableKey(value) {
  const normalized = normalizeValue(value);
  return normalized.startsWith('sb_publishable_') && normalized.endsWith('-');
}

export function validateSupabaseConfig() {
  const issues = [];

  if (isUnset(SUPABASE_URL) || !isValidSupabaseUrl(SUPABASE_URL)) {
    issues.push('SUPABASE_URL');
  }

  if (isUnset(SUPABASE_PUBLISHABLE_KEY) || !isValidSupabaseKey(SUPABASE_PUBLISHABLE_KEY)) {
    issues.push('SUPABASE_PUBLISHABLE_KEY');
  }

  if (!issues.length) return null;

  const baseMessage = `Configuração do Supabase inválida: ${issues.join(', ')}.`;
  if (issues.includes('SUPABASE_PUBLISHABLE_KEY') || isLikelyTruncatedPublishableKey(SUPABASE_PUBLISHABLE_KEY)) {
    return `${baseMessage} ${SUPABASE_KEY_SETUP_HINT}`;
  }

  return `${baseMessage} Verifique o src/config.js.`;
}

export function mapSupabaseKeyErrorMessage(error) {
  const message = normalizeValue(error?.message || error).toLowerCase();
  if (!message) return null;

  if (message.includes('invalid api key') || message.includes('invalid authentication credentials')) {
    return SUPABASE_KEY_SETUP_HINT;
  }

  return null;
}
