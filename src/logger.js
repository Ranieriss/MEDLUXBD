import { addDiagnosticError, addEvent } from './state.js';
import { nowUtcIso } from './shared_datetime.js';

function randomId() {
  return `${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
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
    const payload = {
      context: base.context,
      correlationId: base.correlationId,
      ts: nowUtcIso(),
      level,
      message,
      details: cleanMeta(meta)
    };
    if (level === 'ERROR') {
      addDiagnosticError(new Error(message), context);
      console.error('[MEDLUXBD]', payload);
    } else if (level === 'WARN') {
      console.warn('[MEDLUXBD]', payload);
    } else {
      console.info('[MEDLUXBD]', payload);
    }
    addEvent({ type: level, message: `${context}: ${message}`, details: payload.details, correlationId: base.correlationId });
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
