export type FormState = {
  error?: string;
  ok?: string;
  /** Set when an email could not be sent, so the owner can pass the link on manually. */
  link?: string;
  fieldErrors?: Record<string, string>;
  /** Echoed back so a failed submit doesn't wipe what staff typed. */
  values?: Record<string, string>;
} | null;

export const str = (data: FormData, key: string, max = 2000) => {
  const v = data.get(key);
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
};

export const values = (data: FormData) =>
  Object.fromEntries([...data.entries()].filter(([k, v]) => typeof v === 'string' && !k.startsWith('$'))) as Record<string, string>;
