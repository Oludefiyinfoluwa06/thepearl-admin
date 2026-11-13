import 'server-only';
import { ObjectId, type ClientSession, type Filter } from 'mongodb';
import { getStore, toId, type EventDoc, type LeadDoc } from './db';
import { LEAD_STATUSES, OUTCOMES, SOURCES, label, type Outcome } from './constants';
import { todayLagos } from './format';
import { findActiveUserName } from './users';

/** Who is performing an action (null = the website intake). */
export type Actor = { id: string; name: string } | null;

export type Lead = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  service: string | null;
  message: string | null;
  status: string;
  client_id: string | null;
  created_by_name: string | null;
  created_at: string;
  last_consulted_at: string | null;
};

export type Consultation = {
  id: string;
  held_at: string;
  handled_by_name: string;
  notes: string | null;
  outcome: Outcome;
  follow_up_on: string | null;
};

export type TimelineEvent = {
  id: string;
  type: string;
  summary: string;
  actor_name: string | null;
  created_at: string;
};

const digitsOf = (s: string | null) => (s ?? '').replace(/\D/g, '');
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function toLead(d: LeadDoc): Lead {
  return {
    id: d._id.toString(),
    name: d.name,
    phone: d.phone,
    email: d.email,
    source: d.source,
    service: d.service,
    message: d.message,
    status: d.status,
    client_id: d.clientId?.toString() ?? null,
    created_by_name: d.createdByName,
    created_at: d.createdAt.toISOString(),
    last_consulted_at: d.lastConsultedAt?.toISOString() ?? null,
  };
}

export async function logEvent(
  e: { clientId?: ObjectId | null; leadId?: ObjectId | null; type: string; summary: string; actor: Actor },
  session?: ClientSession,
) {
  const { events } = await getStore();
  await events.insertOne(
    { _id: new ObjectId(), clientId: e.clientId ?? null, leadId: e.leadId ?? null, type: e.type, summary: e.summary, actorName: e.actor?.name ?? null, createdAt: new Date() },
    { session },
  );
}

type NewLead = { name: string; phone: string | null; email: string | null; source: string; service: string | null; message: string | null };

export async function createLead(input: NewLead, actor: Actor): Promise<string> {
  const { leads } = await getStore();
  const _id = new ObjectId();
  await leads.insertOne({
    _id,
    ...input,
    phoneDigits: digitsOf(input.phone),
    status: 'new',
    clientId: null,
    createdBy: actor ? new ObjectId(actor.id) : null,
    createdByName: actor?.name ?? null,
    createdAt: new Date(),
    lastConsultedAt: null,
    followUpOn: null,
  });
  await logEvent({ leadId: _id, type: 'lead_created', summary: `Inquiry logged via ${label(SOURCES, input.source)}`, actor });
  return _id.toString();
}

export async function updateLeadContact(id: string, input: { name: string; phone: string | null; email: string | null }, actor: Actor) {
  const _id = toId(id);
  if (!_id) return;
  const { leads } = await getStore();
  await leads.updateOne({ _id }, { $set: { ...input, phoneDigits: digitsOf(input.phone) } });
  await logEvent({ leadId: _id, type: 'lead_updated', summary: 'Contact details updated', actor });
}

type NewConsultation = { heldAt: string; handledBy: string; notes: string | null; outcome: Outcome; followUpOn: string | null };

export async function addConsultation(leadId: string, input: NewConsultation, actor: Actor) {
  const _id = toId(leadId);
  const handlerId = toId(input.handledBy);
  if (!_id || !handlerId) throw new Error('Invalid consultation target.');
  const handlerName = (await findActiveUserName(input.handledBy)) ?? 'Unknown';
  const { consultations, leads } = await getStore();
  const heldAt = new Date(input.heldAt);

  await consultations.insertOne({
    _id: new ObjectId(),
    leadId: _id,
    heldAt,
    handledBy: handlerId,
    handledByName: handlerName,
    notes: input.notes,
    outcome: input.outcome,
    followUpOn: input.followUpOn,
    createdAt: new Date(),
  });
  const lead = await leads.findOneAndUpdate(
    { _id },
    { $set: { status: input.outcome, lastConsultedAt: heldAt, followUpOn: input.followUpOn } },
    { returnDocument: 'after' },
  );
  await logEvent({
    leadId: _id,
    clientId: lead?.clientId,
    type: 'consultation',
    summary: `Free consultation with ${handlerName}: ${label(OUTCOMES, input.outcome)}${input.notes ? ` — ${input.notes}` : ''}`,
    actor,
  });
}

export async function getLead(id: string): Promise<Lead | undefined> {
  const _id = toId(id);
  if (!_id) return undefined;
  const doc = await (await getStore()).leads.findOne({ _id });
  return doc ? toLead(doc) : undefined;
}

export async function listConsultations(leadId: string): Promise<Consultation[]> {
  const _id = toId(leadId);
  if (!_id) return [];
  const docs = await (await getStore()).consultations.find({ leadId: _id }).sort({ heldAt: -1, _id: -1 }).toArray();
  return docs.map((c) => ({
    id: c._id.toString(),
    held_at: c.heldAt.toISOString(),
    handled_by_name: c.handledByName,
    notes: c.notes,
    outcome: c.outcome,
    follow_up_on: c.followUpOn,
  }));
}

export const toEvent = (e: EventDoc): TimelineEvent => ({
  id: e._id.toString(),
  type: e.type,
  summary: e.summary,
  actor_name: e.actorName,
  created_at: e.createdAt.toISOString(),
});

export async function leadTimeline(leadId: string): Promise<TimelineEvent[]> {
  const _id = toId(leadId);
  if (!_id) return [];
  const docs = await (await getStore()).events.find({ leadId: _id }).sort({ createdAt: -1, _id: -1 }).toArray();
  return docs.map(toEvent);
}

/** Shared name / email / phone matcher for the lead and client lists. `phoneField` differs only by name. */
export function searchFilter(q: string, fields: { name: string; email: string; phone: string }): Filter<never> | null {
  const text = q.trim();
  if (!text) return null;
  const digits = text.replace(/\D/g, '');
  const or: Record<string, unknown>[] = [
    { [fields.name]: { $regex: escapeRegex(text), $options: 'i' } },
    { [fields.email]: { $regex: escapeRegex(text), $options: 'i' } },
  ];
  if (digits.length >= 3) or.push({ [fields.phone]: { $regex: escapeRegex(digits) } });
  return { $or: or } as Filter<never>;
}

export async function listLeads(filters: { q?: string; status?: string; source?: string }): Promise<Lead[]> {
  const and: Filter<LeadDoc>[] = [];
  const s = searchFilter(filters.q ?? '', { name: 'name', email: 'email', phone: 'phoneDigits' });
  if (s) and.push(s as Filter<LeadDoc>);
  if (filters.status && filters.status in LEAD_STATUSES) and.push({ status: filters.status });
  if (filters.source && filters.source in SOURCES) and.push({ source: filters.source });
  const docs = await (await getStore()).leads
    .find(and.length ? { $and: and } : {})
    .sort({ createdAt: -1, _id: -1 })
    .limit(200)
    .toArray();
  return docs.map(toLead);
}

export async function dashboardStats() {
  const { leads, cases } = await getStore();
  const today = todayLagos();
  const [newLeads, followUpsDue, awaitingCase, openCases] = await Promise.all([
    leads.countDocuments({ status: 'new' }),
    leads.countDocuments({ status: 'follow_up_later', followUpOn: { $ne: null, $lte: today } }),
    leads.countDocuments({ status: 'moved_to_assessment', clientId: null }),
    cases.countDocuments({ status: 'open' }),
  ]);
  return { newLeads, followUpsDue, awaitingCase, openCases };
}

export async function followUpsDue(limit = 8) {
  const docs = await (await getStore()).leads
    .find({ status: 'follow_up_later', followUpOn: { $ne: null, $lte: todayLagos() } })
    .sort({ followUpOn: 1 })
    .limit(limit)
    .toArray();
  return docs.map((l) => ({ id: l._id.toString(), name: l.name, phone: l.phone, follow_up_on: l.followUpOn as string }));
}
