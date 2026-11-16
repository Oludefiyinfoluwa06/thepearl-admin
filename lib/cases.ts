import 'server-only';
import { getStore, toId } from './db';
import { CASE_STATUSES, label } from './constants';
import { logEvent, toEvent, type Actor, type TimelineEvent } from './leads';

export type CaseDetail = {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  lead_id: string | null;
  service: string;
  notes: string | null;
  status: string;
  opened_by_name: string;
  opened_at: string;
};

export async function getCase(id: string): Promise<CaseDetail | undefined> {
  const _id = toId(id);
  if (!_id) return undefined;
  const { cases, clients } = await getStore();
  const c = await cases.findOne({ _id });
  if (!c) return undefined;
  const client = await clients.findOne({ _id: c.clientId });
  return {
    id: c._id.toString(),
    client_id: c.clientId.toString(),
    client_name: client?.fullName ?? 'Unknown client',
    client_email: client?.email ?? '',
    lead_id: c.leadId?.toString() ?? null,
    service: c.service,
    notes: c.notes,
    status: c.status,
    opened_by_name: c.openedByName,
    opened_at: c.openedAt.toISOString(),
  };
}

export async function caseTimeline(caseId: string): Promise<TimelineEvent[]> {
  const _id = toId(caseId);
  if (!_id) return [];
  const docs = await (await getStore()).events.find({ caseId: _id }).sort({ createdAt: -1, _id: -1 }).toArray();
  return docs.map(toEvent);
}

export async function updateCaseStatus(caseId: string, status: string, actor: NonNullable<Actor>): Promise<boolean> {
  const _id = toId(caseId);
  if (!_id || !(status in CASE_STATUSES)) return false;
  const { cases } = await getStore();
  const before = await cases.findOneAndUpdate({ _id }, { $set: { status } }, { returnDocument: 'before' });
  if (!before) return false;
  if (before.status !== status) {
    await logEvent({
      clientId: before.clientId,
      caseId: _id,
      type: 'case_status',
      summary: `Case status: ${label(CASE_STATUSES, before.status)} → ${label(CASE_STATUSES, status)}`,
      actor,
    });
  }
  return true;
}

export async function addCaseNote(caseId: string, note: string, actor: NonNullable<Actor>): Promise<boolean> {
  const _id = toId(caseId);
  if (!_id || !note.trim()) return false;
  const c = await (await getStore()).cases.findOne({ _id });
  if (!c) return false;
  await logEvent({ clientId: c.clientId, caseId: _id, type: 'case_note', summary: `Note: ${note.trim()}`, actor });
  return true;
}
