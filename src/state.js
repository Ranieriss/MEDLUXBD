import { nowUtcIso } from './shared_datetime.js';
export const state = {
  session: null,
  user: null,
  profile: null,
  organization_id: null,
  role: 'USER',
  errors: [],
  events: [],
  cache: {
    equipamentos: [],
    obras: [],
    vinculos: [],
    medicoes: []
  }
};

const listeners = new Set();
export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const setState = (patch) => {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
};

export function addDiagnosticError(err, context = 'desconhecido') {
  const payload = {
    at: nowUtcIso(),
    context,
    message: err?.message || String(err),
    details: err?.details || err?.hint || err?.code || null,
    raw: err
  };
  state.errors.unshift(payload);
  state.errors = state.errors.slice(0, 50);
  console.error('[MEDLUXBD][ERROR]', payload);
  listeners.forEach((fn) => fn(state));
  return payload;
}

export function addEvent(evt) {
  state.events.unshift({ at: nowUtcIso(), ...evt });
  state.events = state.events.slice(0, 100);
  listeners.forEach((fn) => fn(state));
}

export const isAdmin = () => state.role === 'ADMIN';
