const SENSITIVE_AUTH_KEYS = new Set([
  'access_token',
  'refresh_token',
  'token',
  'code',
  'expires_at',
  'expires_in',
  'provider_token',
  'provider_refresh_token',
  'type'
]);

function parseParamString(paramString) {
  const parsed = new URLSearchParams();
  if (!paramString) return parsed;

  const normalized = paramString.replace(/^\?/, '');
  const source = new URLSearchParams(normalized);
  for (const [key, value] of source.entries()) {
    if (!parsed.has(key) && value) parsed.set(key, value);
  }

  return parsed;
}

function mergeParams(...paramsList) {
  const merged = new URLSearchParams();
  for (const params of paramsList) {
    for (const [key, value] of params.entries()) {
      if (!merged.has(key) && value) merged.set(key, value);
    }
  }
  return merged;
}

export function redactToken(token) {
  if (!token) return 'none';
  const value = String(token);
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function parseQueryParams() {
  return parseParamString(window.location.search);
}

export function parseHashParams() {
  const hash = (window.location.hash || '').replace(/^#/, '');
  if (!hash) return new URLSearchParams();

  const parts = hash.split('#');
  const firstPart = parts[0] || '';
  const routeQuery = firstPart.includes('?') ? firstPart.split('?').slice(1).join('?') : '';
  const firstPartLooksLikeParams = !firstPart.startsWith('/') && firstPart.includes('=');

  const paramsCandidates = [
    routeQuery,
    firstPartLooksLikeParams ? firstPart : '',
    ...parts.slice(1)
  ];

  return mergeParams(...paramsCandidates.map(parseParamString));
}

export function hasRecoveryParams() {
  const query = parseQueryParams();
  const hash = parseHashParams();
  const code = query.get('code') || hash.get('code');
  const accessToken = hash.get('access_token') || query.get('access_token');
  const refreshToken = hash.get('refresh_token') || query.get('refresh_token');
  const type = hash.get('type') || query.get('type');

  return Boolean(code || (accessToken && refreshToken) || type === 'recovery');
}

export async function trySetSessionFromUrl(supabase) {
  const query = parseQueryParams();
  const hash = parseHashParams();

  const code = query.get('code') || hash.get('code');
  const accessToken = hash.get('access_token') || query.get('access_token');
  const refreshToken = hash.get('refresh_token') || query.get('refresh_token');
  const recoveryType = hash.get('type') || query.get('type');

  console.debug('[auth.callback] Processing auth params', {
    hasCode: Boolean(code),
    hasAccessToken: Boolean(accessToken),
    hasRefreshToken: Boolean(refreshToken),
    recoveryType: recoveryType || 'none',
    code: redactToken(code),
    accessToken: redactToken(accessToken)
  });

  try {
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return { ok: true, method: 'exchangeCodeForSession', error: null, session: data?.session || null };
    }

    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (error) throw error;
      return { ok: true, method: 'setSession', error: null, session: data?.session || null };
    }

    return { ok: false, method: recoveryType === 'recovery' ? 'recovery-without-token' : 'none', error: null, session: null };
  } catch (error) {
    return {
      ok: false,
      method: code ? 'exchangeCodeForSession' : 'setSession',
      error,
      session: null
    };
  }
}

export function cleanAuthParamsFromUrl(targetHashRoute = '/reset-password') {
  const url = new URL(window.location.href);
  for (const key of SENSITIVE_AUTH_KEYS) {
    url.searchParams.delete(key);
  }

  const hash = (window.location.hash || '').replace(/^#/, '');
  const route = hash.startsWith('/') ? hash.split('?')[0].split('#')[0] : targetHashRoute;
  const hashParams = parseHashParams();

  const safeParams = new URLSearchParams();
  for (const [key, value] of hashParams.entries()) {
    if (!SENSITIVE_AUTH_KEYS.has(key)) safeParams.set(key, value);
  }

  const routeWithParams = safeParams.toString() ? `${route}?${safeParams.toString()}` : route;
  const cleanUrl = `${url.origin}${url.pathname}${url.search}#${routeWithParams}`;
  window.history.replaceState({}, '', cleanUrl);
}
