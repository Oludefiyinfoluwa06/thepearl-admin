import { timingSafeEqual } from 'node:crypto';
import { createLead } from '@/lib/leads';
import { SERVICES } from '@/lib/constants';
import { isValidEmail, normalizeEmail } from '@/lib/validation';

// Called server-to-server by the website's /api/contact handler once it has verified the captcha.
// Authenticated with a shared secret; the browser never talks to this endpoint.

const LIMITS = { name: 100, email: 200, phone: 40, service: 60, message: 5000 };

function authorized(request: Request) {
  const expected = process.env.INTAKE_API_KEY;
  const given = request.headers.get('x-intake-key') ?? '';
  if (!expected || expected.length < 16) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized.' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const field = (key: keyof typeof LIMITS) =>
    typeof body[key] === 'string' ? (body[key] as string).trim().slice(0, LIMITS[key]) : '';

  const name = field('name');
  const email = field('email');
  const service = field('service');
  if (!name || !email || !isValidEmail(email)) {
    return Response.json({ error: 'A name and valid email are required.' }, { status: 400 });
  }

  const id = await createLead(
    {
      name,
      email: normalizeEmail(email),
      phone: field('phone') || null,
      source: 'website',
      service: service in SERVICES ? service : 'other',
      message: field('message') || null,
    },
    null,
  );
  return Response.json({ ok: true, id }, { status: 201 });
}
