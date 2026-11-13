import 'server-only';
import { ObjectId, type Filter } from 'mongodb';
import { getStore, toId, type ClientDoc } from './db';
import { SERVICES, label } from './constants';
import { isValidEmail, normalizeEmail } from './validation';
import { logEvent, searchFilter, toEvent, type Actor, type TimelineEvent } from './leads';

export type Client = { id: string; full_name: string; email: string; phone: string | null; created_at: string };
export type Case = { id: string; service: string; notes: string | null; status: string; opened_by_name: string; opened_at: string };

const toClient = (c: ClientDoc): Client => ({
  id: c._id.toString(),
  full_name: c.fullName,
  email: c.email,
  phone: c.phone,
  created_at: c.createdAt.toISOString(),
});

export async function findClientsByEmail(email: string): Promise<Client[]> {
  const docs = await (await getStore()).clients.find({ email: normalizeEmail(email) }).sort({ _id: 1 }).toArray();
  return docs.map(toClient);
}

export async function getClient(id: string): Promise<Client | undefined> {
  const _id = toId(id);
  if (!_id) return undefined;
  const doc = await (await getStore()).clients.findOne({ _id });
  return doc ? toClient(doc) : undefined;
}

export async function listClients(q?: string) {
  const { clients, cases } = await getStore();
  const filter = (searchFilter(q ?? '', { name: 'fullName', email: 'email', phone: 'phoneDigits' }) ?? {}) as Filter<ClientDoc>;
  const docs = await clients.find(filter).sort({ createdAt: -1, _id: -1 }).limit(200).toArray();
  const counts = await cases
    .aggregate<{ _id: ObjectId; n: number }>([{ $match: { clientId: { $in: docs.map((d) => d._id) } } }, { $group: { _id: '$clientId', n: { $sum: 1 } } }])
    .toArray();
  const byClient = new Map(counts.map((c) => [c._id.toString(), c.n]));
  return docs.map((d) => ({ ...toClient(d), case_count: byClient.get(d._id.toString()) ?? 0 }));
}

export async function clientCases(clientId: string): Promise<Case[]> {
  const _id = toId(clientId);
  if (!_id) return [];
  const docs = await (await getStore()).cases.find({ clientId: _id }).sort({ openedAt: -1, _id: -1 }).toArray();
  return docs.map((c) => ({
    id: c._id.toString(),
    service: c.service,
    notes: c.notes,
    status: c.status,
    opened_by_name: c.openedByName,
    opened_at: c.openedAt.toISOString(),
  }));
}

export async function clientLeads(clientId: string) {
  const _id = toId(clientId);
  if (!_id) return [];
  const docs = await (await getStore()).leads.find({ clientId: _id }).sort({ createdAt: -1 }).toArray();
  return docs.map((l) => ({ id: l._id.toString(), source: l.source, service: l.service, status: l.status, created_at: l.createdAt.toISOString() }));
}

/** Everything that happened to this client, including their time as a lead. */
export async function clientTimeline(clientId: string): Promise<TimelineEvent[]> {
  const _id = toId(clientId);
  if (!_id) return [];
  const { leads, events } = await getStore();
  const leadIds = (await leads.find({ clientId: _id }, { projection: { _id: 1 } }).toArray()).map((l) => l._id);
  const docs = await events
    .find({ $or: [{ clientId: _id }, { leadId: { $in: leadIds } }] })
    .sort({ createdAt: -1, _id: -1 })
    .toArray();
  return docs.map(toEvent);
}

export type OpenCaseInput = {
  leadId: string | null;
  clientId: string | null;
  email: string;
  service: string;
  notes: string | null;
  /** How to treat an email that already belongs to another client. */
  resolution: 'link' | 'separate' | null;
  linkClientId: string | null;
};

export type OpenCaseResult =
  | { ok: true; clientId: string; caseId: string }
  | { ok: false; error: string; field?: 'email' | 'service' | 'resolution' };

/**
 * The one place a case is created. The email rule is enforced here (not just in the form) so
 * no caller — UI, import, or future API — can open a case for a client without a valid email.
 */
export async function openCase(input: OpenCaseInput, actor: NonNullable<Actor>): Promise<OpenCaseResult> {
  if (!(input.service in SERVICES)) return { ok: false, error: 'Choose the type of case.', field: 'service' };

  const store = await getStore();
  const { leads, clients, cases } = store;
  const leadId = toId(input.leadId);
  const lead = leadId ? await leads.findOne({ _id: leadId }) : null;
  if (input.leadId && !lead) return { ok: false, error: 'That inquiry no longer exists.' };

  let clientId = toId(input.clientId) ?? lead?.clientId ?? null;
  let newClient: ClientDoc | null = null;
  let linkExisting = false;

  if (clientId) {
    const existing = await clients.findOne({ _id: clientId });
    if (!existing) return { ok: false, error: 'That client no longer exists.' };
    // Defence in depth: legacy or hand-edited rows still must carry a valid email.
    if (!isValidEmail(existing.email)) return { ok: false, error: 'This client has no valid email.', field: 'email' };
  } else {
    if (!lead) return { ok: false, error: 'Open a case from an inquiry or an existing client.' };
    if (!input.email.trim()) return { ok: false, error: 'An email address is required before a case can be opened.', field: 'email' };
    if (!isValidEmail(input.email)) return { ok: false, error: 'Enter a valid email address, like name@example.com.', field: 'email' };

    const email = normalizeEmail(input.email);
    const duplicates = await clients.find({ email }).sort({ _id: 1 }).toArray();
    if (duplicates.length && !input.resolution) {
      return { ok: false, error: 'This email already belongs to another client. Choose how to proceed.', field: 'resolution' };
    }
    if (duplicates.length && input.resolution === 'link') {
      clientId = (duplicates.find((d) => d._id.toString() === input.linkClientId) ?? duplicates[0])._id;
      linkExisting = true;
    } else {
      newClient = { _id: new ObjectId(), fullName: lead.name, email, phone: lead.phone, phoneDigits: lead.phoneDigits, createdAt: new Date() };
      clientId = newClient._id;
    }
  }

  const caseId = new ObjectId();
  const session = store.client.startSession();
  try {
    // All-or-nothing: no half-created clients or cases.
    await session.withTransaction(async () => {
      if (newClient) {
        await clients.insertOne(newClient, { session });
        await logEvent({ clientId, type: 'client_created', summary: 'Client profile created', actor }, session);
      }
      if (linkExisting && lead?.phone) {
        await clients.updateOne({ _id: clientId!, phone: null }, { $set: { phone: lead.phone, phoneDigits: lead.phoneDigits } }, { session });
      }
      if (lead && !lead.clientId) {
        await leads.updateOne(
          { _id: lead._id },
          { $set: { clientId, email: newClient?.email ?? (await clients.findOne({ _id: clientId! }, { session }))!.email } },
          { session },
        );
      }
      await cases.insertOne(
        { _id: caseId, clientId: clientId!, leadId: lead?._id ?? null, service: input.service, notes: input.notes, status: 'open', openedBy: new ObjectId(actor.id), openedByName: actor.name, openedAt: new Date() },
        { session },
      );
      await logEvent({ clientId, leadId: lead?._id ?? null, type: 'case_opened', summary: `Case opened: ${label(SERVICES, input.service)}`, actor }, session);
    });
  } finally {
    await session.endSession();
  }
  return { ok: true, clientId: clientId!.toString(), caseId: caseId.toString() };
}
