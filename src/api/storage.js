import { supabase } from '../supabaseClient.js';
import { addDiagnosticError } from '../state.js';
import { nowUnixMs } from '../shared_datetime.js';

export async function uploadTermo({ file, obraCodigo, equipamentoCodigo }) {
  const safeName = file.name.replace(/\s+/g, '_');
  const path = `termos/${obraCodigo}/${equipamentoCodigo}/${nowUnixMs()}_${safeName}`;
  const { error } = await supabase.storage.from('medlux').upload(path, file, { upsert: false });
  if (error) {
    addDiagnosticError(error, 'storage.uploadTermo');
    throw error;
  }
  return path;
}
