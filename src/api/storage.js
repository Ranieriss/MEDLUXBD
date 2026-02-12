import { supabase } from '../supabaseClient.js';
import { addDiagnosticError } from '../state.js';

export async function uploadTermo({ file, obraCodigo, equipamentoCodigo }) {
  const safeName = file.name.replace(/\s+/g, '_');
  const path = `termos/${obraCodigo}/${equipamentoCodigo}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from('medlux').upload(path, file, { upsert: false });
  if (error) {
    addDiagnosticError(error, 'storage.uploadTermo');
    throw error;
  }
  return path;
}
