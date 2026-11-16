import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';

export const MAIL_DIR = path.join(__dirname, '.mail');
const TEST_DB = 'tptt-admin-e2e';

/** Starts a fake SMTP server that saves every message as JSON, and wipes the test database. */
export default async function globalSetup() {
  if (process.env.DNS_SERVERS) {
    const servers = process.env.DNS_SERVERS.split(',').map((s) => s.trim());
    dns.setServers(servers);
    dns.promises.setServers(servers);
  }

  // Safety: only ever drop a database that is clearly a throwaway one.
  if (!TEST_DB.endsWith('-e2e')) throw new Error('Refusing to wipe a non-test database.');
  const client = new MongoClient(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 20_000 });
  await client.connect();
  await client.db(TEST_DB).dropDatabase();
  await client.close();

  fs.rmSync(MAIL_DIR, { recursive: true, force: true });
  fs.mkdirSync(MAIL_DIR, { recursive: true });

  let n = 0;
  const smtp = new SMTPServer({
    authOptional: true,
    allowInsecureAuth: true,
    disabledCommands: ['STARTTLS'],
    onAuth: (_auth, _session, cb) => cb(null, { user: 'test' }),
    onData(stream, _session, cb) {
      simpleParser(stream).then((mail) => {
        fs.writeFileSync(
          path.join(MAIL_DIR, `${String(++n).padStart(4, '0')}.json`),
          JSON.stringify({ to: mail.to && 'text' in mail.to ? mail.to.text : '', subject: mail.subject, text: mail.text }),
        );
        cb();
      });
    },
  });
  await new Promise<void>((resolve) => smtp.listen(2525, '127.0.0.1', resolve));
  return () => new Promise<void>((resolve) => smtp.close(() => resolve()));
}
