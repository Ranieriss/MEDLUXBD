import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  validateSupabaseConfig
} from './config.js';
import { addDiagnosticError } from './state.js';
import { toast } from './ui.js';

const configErrorMessage = validateSupabaseConfig();
if (configErrorMessage) {
  toast(configErrorMessage, 'error');
  console.error(configErrorMessage);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export function assertSupabaseConfig() {
  if (configErrorMessage) {
    const err = new Error(configErrorMessage);
    addDiagnosticError(err, 'config.supabase');
    throw err;
  }
}

export async function runQuery(promise, context = 'api') {
  assertSupabaseConfig();
  const { data, error } = await promise;
  if (error) {
    addDiagnosticError(error, context);
    throw error;
  }
  return data;
}

export async function getSignedFileUrl(path, expiresIn = 120) {
  assertSupabaseConfig();
  try {
    const { data, error } = await supabase.storage.from('medlux').createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data?.signedUrl;
  } catch (err) {
    addDiagnosticError(err, `storage.signedUrl:${path}`);
    const publicData = supabase.storage.from('medlux').getPublicUrl(path);
    return publicData?.data?.publicUrl;
  }
}
