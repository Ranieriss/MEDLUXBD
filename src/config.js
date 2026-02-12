export const SUPABASE_URL = 'https://gcmhgyjjinqafbdmuaqy.supabase.co';

// Cole aqui sua chave pública completa (sb_publishable_...).
// NUNCA use uma chave sb_secret no frontend.
export const SUPABASE_PUBLISHABLE_KEY = '';

const PLACEHOLDER_TOKENS = [
  'YOUR_',
  'REPLACE_',
  'CHANGE_ME',
  'EXAMPLE',
  'COLE_AQUI'
];

function isUnset(value) {
  if (!value) return true;
  const normalized = String(value).trim();
  if (!normalized) return true;
  return PLACEHOLDER_TOKENS.some((token) => normalized.toUpperCase().includes(token));
}

function isLikelyPlaceholderPublishableKey(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return true;
  if (!normalized.startsWith('sb_publishable_')) return true;
  return normalized.length < 48;
}

export function validateSupabaseConfig() {
  const missing = [];
  if (isUnset(SUPABASE_URL)) missing.push('SUPABASE_URL');
  if (isUnset(SUPABASE_PUBLISHABLE_KEY) || isLikelyPlaceholderPublishableKey(SUPABASE_PUBLISHABLE_KEY)) {
    missing.push('SUPABASE_PUBLISHABLE_KEY');
  }

  if (!missing.length) return null;

  return `Configuração do Supabase inválida: ${missing.join(', ')}. `
    + 'Abra src/config.js e preencha com SUPABASE_URL e sua sb_publishable completa.';
}
