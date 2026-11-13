import 'server-only';
import dns from 'node:dns';
import { MongoClient, ObjectId, type Collection, type Db } from 'mongodb';
import { hashPassword } from './password';
import type { Outcome, Role } from './constants';

// Some home/office routers drop the SRV lookup that mongodb+srv:// needs. Optional override, e.g. "8.8.8.8,1.1.1.1".
if (process.env.DNS_SERVERS) {
  const servers = process.env.DNS_SERVERS.split(',').map((s) => s.trim());
  dns.setServers(servers);
  dns.promises.setServers(servers); // the promise API has its own default resolver

  // Opening a connection looks each shard host up through the OS resolver (getaddrinfo), which ignores the
  // servers above. If the OS lookup fails on a flaky network, retry it through the configured servers.
  const osLookup = dns.lookup;
  const patched = ((hostname: string, options: unknown, callback?: unknown) => {
    const cb = (typeof options === 'function' ? options : callback) as (err: Error | null, address?: unknown, family?: number) => void;
    const opts = (typeof options === 'object' && options ? options : {}) as { all?: boolean };
    (osLookup as (...a: unknown[]) => void)(hostname, options, (err: NodeJS.ErrnoException | null, address: unknown, family: number) => {
      if (!err || !['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ETIMEOUT'].includes(err.code ?? '')) return cb(err, address, family);
      dns.promises.resolve4(hostname).then(
        (ips) => (opts.all ? cb(null, ips.map((a) => ({ address: a, family: 4 }))) : cb(null, ips[0], 4)),
        () => cb(err),
      );
    });
  }) as unknown as typeof dns.lookup;
  dns.lookup = Object.assign(patched, osLookup);
}

export type UserDoc = { _id: ObjectId; name: string; email: string; passwordHash: string | null; role: Role; active: boolean; createdAt: Date };
export type TokenDoc = { _id: string; userId: ObjectId; purpose: 'invite' | 'reset'; createdAt: Date; expiresAt: Date };
export type SessionDoc = { _id: string; userId: ObjectId; expiresAt: Date };
export type ClientDoc = { _id: ObjectId; fullName: string; email: string; phone: string | null; phoneDigits: string; createdAt: Date };
export type LeadDoc = {
  _id: ObjectId;
  name: string;
  phone: string | null;
  phoneDigits: string;
  email: string | null;
  source: string;
  service: string | null;
  message: string | null;
  status: string;
  clientId: ObjectId | null;
  createdBy: ObjectId | null;
  createdByName: string | null;
  createdAt: Date;
  lastConsultedAt: Date | null;
  followUpOn: string | null;
};
export type ConsultationDoc = {
  _id: ObjectId;
  leadId: ObjectId;
  heldAt: Date;
  handledBy: ObjectId;
  handledByName: string;
  notes: string | null;
  outcome: Outcome;
  followUpOn: string | null;
  createdAt: Date;
};
export type CaseDoc = {
  _id: ObjectId;
  clientId: ObjectId;
  leadId: ObjectId | null;
  service: string;
  notes: string | null;
  status: string;
  openedBy: ObjectId;
  openedByName: string;
  openedAt: Date;
};
export type EventDoc = {
  _id: ObjectId;
  clientId: ObjectId | null;
  leadId: ObjectId | null;
  type: string;
  summary: string;
  actorName: string | null;
  createdAt: Date;
};

type Store = {
  client: MongoClient;
  db: Db;
  users: Collection<UserDoc>;
  sessions: Collection<SessionDoc>;
  tokens: Collection<TokenDoc>;
  clients: Collection<ClientDoc>;
  leads: Collection<LeadDoc>;
  consultations: Collection<ConsultationDoc>;
  cases: Collection<CaseDoc>;
  events: Collection<EventDoc>;
};

/** Parses a 24-char hex id from a URL or form; null if it isn't one. */
export const toId = (value: string | null | undefined) => (value && /^[0-9a-f]{24}$/i.test(value) ? new ObjectId(value) : null);

async function connect(): Promise<Store> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set. See .env.example.');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15_000 });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'tptt-admin');

  const store: Store = {
    client,
    db,
    users: db.collection('users'),
    sessions: db.collection('sessions'),
    tokens: db.collection('tokens'),
    clients: db.collection('clients'),
    leads: db.collection('leads'),
    consultations: db.collection('consultations'),
    cases: db.collection('cases'),
    events: db.collection('events'),
  };
  await setup(store);
  return store;
}

async function setup(s: Store) {
  // A client always has a well-formed email: a case cannot exist without one. Enforced here as a last line of defence.
  const validator = {
    $jsonSchema: {
      bsonType: 'object',
      required: ['fullName', 'email'],
      properties: { email: { bsonType: 'string', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$' } },
    },
  };
  try {
    await s.db.createCollection('clients', { validator });
  } catch (e) {
    if ((e as { code?: number }).code !== 48) throw e; // 48 = already exists
    await s.db.command({ collMod: 'clients', validator });
  }

  await Promise.all([
    s.users.createIndex({ email: 1 }, { unique: true }),
    s.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    s.tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    s.tokens.createIndex({ userId: 1, purpose: 1 }),
    s.clients.createIndex({ email: 1 }),
    s.leads.createIndex({ createdAt: -1 }),
    s.leads.createIndex({ status: 1 }),
    s.consultations.createIndex({ leadId: 1, heldAt: -1 }),
    s.cases.createIndex({ clientId: 1 }),
    s.events.createIndex({ clientId: 1, createdAt: -1 }),
    s.events.createIndex({ leadId: 1, createdAt: -1 }),
  ]);

  // First run only: create the owner from env so no default password ever ships.
  if ((await s.users.estimatedDocumentCount()) > 0) return;
  const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!email || !password) {
    console.warn('No users exist. Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD to create the first owner.');
    return;
  }
  try {
    await s.users.insertOne({
      _id: new ObjectId(),
      name: process.env.ADMIN_SEED_NAME?.trim() || 'Owner',
      email,
      passwordHash: hashPassword(password),
      role: 'owner',
      active: true,
      createdAt: new Date(),
    });
  } catch (e) {
    if ((e as { code?: number }).code !== 11000) throw e; // another worker seeded first
  }
}

const g = globalThis as unknown as { __tpttMongo?: Promise<Store> };

/** One shared connection per server process (also survives dev hot reloads). */
export function getStore(): Promise<Store> {
  g.__tpttMongo ??= connect().catch((e) => {
    g.__tpttMongo = undefined; // let the next request retry
    throw e;
  });
  return g.__tpttMongo;
}
