import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import type { ObjectId } from 'mongodb';
import { getStore, type TokenDoc } from './db';

const TTL_MS = { invite: 7 * 86_400_000, reset: 60 * 60_000 } as const;
const sha = (v: string) => createHash('sha256').update(v).digest('hex');

/** Creates a single-use link token; any earlier token of that kind for the user stops working. Only the hash is stored. */
export async function issueToken(userId: ObjectId, purpose: TokenDoc['purpose']) {
  const { tokens } = await getStore();
  await tokens.deleteMany({ userId, purpose });
  const raw = randomBytes(32).toString('base64url');
  const now = Date.now();
  await tokens.insertOne({ _id: sha(raw), userId, purpose, createdAt: new Date(now), expiresAt: new Date(now + TTL_MS[purpose]) });
  return raw;
}

export async function peekToken(raw: string) {
  if (!raw || raw.length > 100) return null;
  const doc = await (await getStore()).tokens.findOne({ _id: sha(raw), expiresAt: { $gt: new Date() } });
  return doc ? { userId: doc.userId, purpose: doc.purpose } : null;
}

/** Atomically uses up a token (so a link can't be replayed). Returns null if invalid or expired. */
export async function consumeToken(raw: string) {
  if (!raw || raw.length > 100) return null;
  const doc = await (await getStore()).tokens.findOneAndDelete({ _id: sha(raw), expiresAt: { $gt: new Date() } });
  return doc ? { userId: doc.userId, purpose: doc.purpose } : null;
}

export async function recentlyIssued(userId: ObjectId, purpose: TokenDoc['purpose'], seconds = 60) {
  const doc = await (await getStore()).tokens.findOne({ userId, purpose, createdAt: { $gt: new Date(Date.now() - seconds * 1000) } });
  return Boolean(doc);
}
