import { supabase, runQuery } from '../supabaseClient.js';
import { state, setState } from '../state.js';

export async function getCurrentOrgId(forceReload = false) {
  if (!forceReload && state.profile?.organization_id) return state.profile.organization_id;
  if (!state.user?.id) return null;

  const profile = await runQuery(
    supabase.from('profiles').select('organization_id').eq('id', state.user.id).maybeSingle(),
    'org.getCurrentOrgId'
  );

  const orgId = profile?.organization_id || null;
  if (state.profile) {
    setState({ profile: { ...state.profile, organization_id: orgId } });
  }
  return orgId;
}
