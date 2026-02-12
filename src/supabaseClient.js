import { supabaseUrl, supabaseAnonKey } from './config.js';
import { addDiagnosticError } from './state.js';

if (!window.supabase?.createClient) {
  throw new Error('SDK Supabase não carregada. Verifique conexão/CDN.');
}

export const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export async function runQuery(promise, context = 'api') {
  const { data, error } = await promise;
  if (error) {
    addDiagnosticError(error, context);
    throw error;
  }
  return data;
}

export async function getSignedFileUrl(path, expiresIn = 120) {
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
