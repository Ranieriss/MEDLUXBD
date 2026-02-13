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

export function createLogger(context) {
  const base = { context, correlationId: pageCorrelationId };

  const write = (level, message, meta = {}) => {
    const route = window.location.hash.replace('#', '') || '/';
    const payload = {
      context: base.context,
      timestamp: nowUtcIso(),
      level,
      route,
      action: meta.action || context,
      entity: meta.entity || null,
      message,
      details: cleanMeta(meta.details || meta),
      correlation_id: base.correlationId,
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

    addEvent({ type: level, message: `${context}: ${message}`, meta: payload.details, correlationId: base.correlationId });
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
