import 'server-only';
import { ObjectId } from 'mongodb';
import { getStore, toId } from './db';
import { hashPassword } from './password';
import { normalizeEmail } from './validation';
import type { Role } from './constants';

export type Member = { id: string; name: string; email: string; role: Role; active: boolean; created_at: string; invited: boolean };

export async function listActiveUsers() {
  const { users } = await getStore();
  const docs = await users.find({ active: true }).sort({ name: 1 }).toArray();
  return docs.map((u) => ({ id: u._id.toString(), name: u.name }));
}

export async function listMembers(): Promise<Member[]> {
  const { users } = await getStore();
  const docs = await users.find().sort({ active: -1, name: 1 }).toArray();
  return docs.map((u) => ({ id: u._id.toString(), name: u.name, email: u.email, role: u.role, active: u.active, created_at: u.createdAt.toISOString(), invited: !u.passwordHash }));
}

export async function emailTaken(email: string) {
  return Boolean(await (await getStore()).users.findOne({ email: normalizeEmail(email) }, { projection: { _id: 1 } }));
}

/** Creates the account with no password. The person chooses one through the emailed invitation link. */
export async function createUser(input: { name: string; email: string; role: Role }) {
  const { users } = await getStore();
  const _id = new ObjectId();
  await users.insertOne({ _id, name: input.name, email: normalizeEmail(input.email), passwordHash: null, role: input.role, active: true, createdAt: new Date() });
  return _id;
}

export async function findUserByEmail(email: string) {
  return (await (await getStore()).users.findOne({ email: normalizeEmail(email) })) ?? null;
}

export async function findUserById(id: ObjectId | string) {
  const _id = typeof id === 'string' ? toId(id) : id;
  return _id ? ((await (await getStore()).users.findOne({ _id })) ?? null) : null;
}

/** Sets a new password and signs the person out everywhere. */
export async function setPassword(userId: ObjectId, password: string) {
  const { users, sessions } = await getStore();
  await users.updateOne({ _id: userId }, { $set: { passwordHash: hashPassword(password) } });
  await sessions.deleteMany({ userId });
}

/** Returns false if the change was refused (e.g. it would leave no active owner). */
export async function setUserActive(userId: string, active: boolean) {
  const id = toId(userId);
  if (!id) return false;
  const { users, sessions } = await getStore();
  if (!active) {
    const otherOwners = await users.countDocuments({ role: 'owner', active: true, _id: { $ne: id } });
    if (otherOwners === 0) return false;
    await sessions.deleteMany({ userId: id });
  }
  await users.updateOne({ _id: id }, { $set: { active } });
  return true;
}

export async function findActiveUserName(userId: string) {
  const id = toId(userId);
  if (!id) return null;
  const u = await (await getStore()).users.findOne({ _id: id, active: true });
  return u?.name ?? null;
}
