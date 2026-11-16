import fs from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import { MAIL_DIR } from './global-setup';

export const OWNER = { email: 'owner@example.com', password: 'devpassword123' };
export const INTAKE_KEY = 'test-intake-key-0123456789';
export const ID = '[0-9a-f]{24}';

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type=submit]');
}

export async function signInAsOwner(page: Page) {
  await signIn(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL('/');
}

type Mail = { to: string; subject: string; text: string };

/** Waits for a captured email matching `match` (to the given address) and returns it. */
export async function waitForMail(to: string, subjectIncludes: string, after = 0): Promise<Mail> {
  for (let i = 0; i < 60; i++) {
    const files = fs.existsSync(MAIL_DIR) ? fs.readdirSync(MAIL_DIR).sort() : [];
    const mails = files.slice(after).map((f) => JSON.parse(fs.readFileSync(path.join(MAIL_DIR, f), 'utf8')) as Mail);
    const found = mails.find((m) => m.to.includes(to) && m.subject.includes(subjectIncludes));
    if (found) return found;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No email to ${to} with subject containing "${subjectIncludes}"`);
}

export const mailCount = () => (fs.existsSync(MAIL_DIR) ? fs.readdirSync(MAIL_DIR).length : 0);
export const linkIn = (mail: Mail) => mail.text.match(/https?:\/\/\S+/)![0];
