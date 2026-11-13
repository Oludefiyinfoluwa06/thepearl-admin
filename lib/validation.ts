// Shared by server actions and client-side hints. Same shape as the website's check, plus a minimum TLD length.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  const email = normalizeEmail(value);
  return email.length <= 200 && EMAIL_RE.test(email);
}
