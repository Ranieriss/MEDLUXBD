import { addDiagnosticError, addEvent } from './state.js';
import { nowUtcIso } from './shared_datetime.js';
import { APP_VERSION } from './version.js';

function randomId() {
  return crypto.randomUUID();
}

export const pageCorrelationId = randomId();

function cleanMeta(meta) {
  try {
    return JSON.parse(JSON.stringify(meta || {}));
  } catch (_error) {
    return { note: 'meta_non_serializable' };
  }
}

export async function sendAppLog(payload) {
  try {
    const { supabase } = await import('./supabaseClient.js');
    await supabase.from('app_logs').insert(payload);
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
      entity: sanitizedMeta.entity || null,
      message,
      details: sanitizedMeta.details || null,
      meta: sanitizedMeta,
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

    addEvent({ type: level, message: `${context}: ${message}`, meta: payload.meta, correlation_id: payload.correlation_id });
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
