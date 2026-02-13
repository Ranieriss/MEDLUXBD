const BR_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'medium'
});

const MS_PER_DAY = 86400000;

export function nowUtcIso() {
  return new Date().toISOString();
}

export function parseIsoSafe(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toInputDateTimeLocal(value) {
  const parsed = parseIsoSafe(value);
  if (!parsed) return '';
  const tzMs = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - tzMs).toISOString().slice(0, 16);
}

export function localInputToUtcIso(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function formatLocalBrSafe(value) {
  const parsed = parseIsoSafe(value);
  if (!parsed) return '-';
  return BR_FORMATTER.format(parsed);
}

export function nowUnixMs() {
  return Date.now();
}

export function daysSinceIso(value) {
  const parsed = parseIsoSafe(value);
  if (!parsed) return null;
  return Math.floor((nowUnixMs() - parsed.getTime()) / MS_PER_DAY);
}
