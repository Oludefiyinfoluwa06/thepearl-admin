// Staff are in Nigeria (WAT, UTC+1, no DST). Pin the zone so server and browser always agree.
const TZ = 'Africa/Lagos';

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ }).format(new Date(iso));
}

export function formatDate(iso: string) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00+01:00`) : new Date(iso);
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: TZ }).format(d);
}

/** Value for <input type="datetime-local"> showing "now" in WAT. */
export function nowForInput() {
  return new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeStyle: 'short', timeZone: TZ })
    .format(new Date())
    .replace(' ', 'T');
}

/** Parse a datetime-local value (entered in WAT) to ISO. Returns null if invalid. */
export function inputToIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00+01:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Today's date (YYYY-MM-DD) in WAT, for comparing against follow-up dates. */
export function todayLagos() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}
