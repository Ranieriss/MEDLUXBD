import { addDiagnosticError, addEvent } from './state.js';
import { nowUtcIso } from './shared_datetime.js';
import { APP_VERSION } from './version.js';

function randomId() {
  return crypto.randomUUID();
}

export const pageCorrelationId = randomId();

function deepSanitize(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => deepSanitize(item));
  if (typeof value !== 'object') return value;

  const clean = {};
  Object.entries(value).forEach(([key, entryValue]) => {
    const normalizedKey = String(key || '').toLowerCase();
    if (normalizedKey.includes('password') || normalizedKey.includes('token')) return;
    clean[key] = deepSanitize(entryValue);
  });
  return clean;
}

function cleanMeta(meta) {
  try {
    return deepSanitize(JSON.parse(JSON.stringify(meta || {})));
  } catch (_error) {
    return { note: 'meta_non_serializable' };
  }
}

export async function sendAppLog(payload) {
  try {
    const { supabase } = await import('./supabaseClient.js');
    const { error } = await supabase.from('app_logs').insert(payload);
    if (!error) return;

    if (error.code === '42703' && Object.prototype.hasOwnProperty.call(payload, 'timestamp')) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.timestamp;
      const { error: fallbackError } = await supabase.from('app_logs').insert(fallbackPayload);
      if (!fallbackError) return;
      throw fallbackError;
    }

    throw error;
  } catch (error) {
    console.warn('[MEDLUXBD][app_logs] falha ao enviar log', error?.message || error);
  }
}

export function createLogger(context) {
  const base = { context, correlationId: pageCorrelationId };

  const write = (level, message, meta = {}) => {
    const route = window.location.hash.replace('#', '') || '/';
    const sanitizedMeta = cleanMeta(meta);

    const payload = {
      timestamp: nowUtcIso(),
      level,
      route,
      action: sanitizedMeta.action || context,
      entity: sanitizedMeta.entity || context,
      message,
      details: sanitizedMeta.details || null,
      correlation_id: sanitizedMeta.correlation_id || base.correlationId,
      app_version: APP_VERSION
    };

    if (level === 'ERROR') {
      addDiagnosticError(new Error(message), context);
      console.error('[MEDLUXBD]', payload);
    } else if (level === 'WARN') {
      console.warn('[MEDLUXBD]', payload);
    } else {
      console.info('[MEDLUXBD]', payload);
    }

    addEvent({ type: level, message: `${context}: ${message}`, details: payload.details, correlation_id: payload.correlation_id });
    void sendAppLog(payload);
    return payload;
  };

  return {
    info: (message, meta) => write('INFO', message, meta),
    warn: (message, meta) => write('WARN', message, meta),
    error: (message, meta) => write('ERROR', message, meta),
    withActionCorrelation(action) {
      return createLogger(`${context}.${action}.${randomId().slice(0, 6)}`);
    }
  };
}
