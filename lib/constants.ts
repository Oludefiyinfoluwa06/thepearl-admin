export const SOURCES = {
  website: 'Website form',
  whatsapp: 'WhatsApp',
  call: 'Phone call',
  walk_in: 'Walk-in',
  referral: 'Referral',
  other: 'Other',
} as const;

// Mirrors the options on the website contact form.
export const SERVICES = {
  assessment: 'Comprehensive Assessment',
  'study-visa': 'Study Visa',
  'visit-visa': 'Visit / Tourist Visa',
  pr: 'Permanent Residency',
  'professional-licensing': 'Professional Licensing',
  'trades-licensing': 'Skilled Trades Licensing',
  travel: 'Hotel & Flight Booking',
  resume: 'Canadian Resume Services',
  other: 'Other',
} as const;

export const OUTCOMES = {
  moved_to_assessment: 'Moved to assessment',
  not_interested: 'Not interested',
  follow_up_later: 'Follow up later',
} as const;

export const LEAD_STATUSES = {
  new: 'New',
  ...OUTCOMES,
} as const;

export type Source = keyof typeof SOURCES;
export type Outcome = keyof typeof OUTCOMES;
export type Role = 'owner' | 'staff';

export const label = (map: Record<string, string>, key: string | null | undefined) =>
  (key && map[key]) || key || '—';
