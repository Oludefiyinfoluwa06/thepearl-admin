import 'server-only';
import nodemailer from 'nodemailer';
import { headers } from 'next/headers';

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Public base URL used in emailed links. Prefer APP_URL; otherwise infer it from the current request. */
export async function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

function transport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT ?? 465);
  return nodemailer.createTransport({ host: SMTP_HOST ?? 'smtp.gmail.com', port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
}

/** Returns true if the email was handed to the SMTP server; false if mail isn't configured or sending failed. */
async function send(to: string, subject: string, text: string, html: string) {
  const t = transport();
  if (!t) {
    console.warn(`SMTP_USER / SMTP_PASS not set, so the email "${subject}" to ${to} was not sent.`);
    return false;
  }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM ?? `"The Pearl Admin" <${process.env.SMTP_USER}>`, to, subject, text, html });
    return true;
  } catch (error) {
    console.error('Failed to send email', error);
    return false;
  }
}

function layout(title: string, name: string, body: string, buttonText: string, link: string, footer: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1f2937">
  <div style="background:#0A2342;padding:18px 24px;border-bottom:3px solid #C9A84C">
    <span style="font-family:Georgia,serif;font-size:20px;font-weight:bold;color:#fff">The Pearl</span>
    <span style="font-size:11px;letter-spacing:3px;color:#C9A84C;text-transform:uppercase;margin-left:8px">Admin</span>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:0">
    <h2 style="font-family:Georgia,serif;color:#0A2342;margin:0 0 12px">${esc(title)}</h2>
    <p>Hi ${esc(name)},</p><p>${body}</p>
    <p style="margin:24px 0"><a href="${esc(link)}" style="background:#C9A84C;color:#0A2342;font-weight:bold;padding:12px 22px;text-decoration:none;text-transform:uppercase;letter-spacing:1px;font-size:13px">${esc(buttonText)}</a></p>
    <p style="font-size:12px;color:#6b7280">Or paste this link into your browser:<br>${esc(link)}</p>
    <p style="font-size:12px;color:#6b7280">${footer}</p>
  </div></div>`;
}

export function sendInvite(to: string, name: string, link: string, invitedBy: string) {
  const text = `Hi ${name},\n\n${invitedBy} invited you to The Pearl Travel and Tours admin dashboard.\nChoose your password here (link valid for 7 days):\n${link}\n`;
  return send(
    to,
    'You have been invited to The Pearl Admin',
    text,
    layout('You have been invited', name, `${esc(invitedBy)} invited you to the admin dashboard. Choose a password to activate your account.`, 'Set my password', link, 'This link works once and expires in 7 days. If you were not expecting it, ignore this email.'),
  );
}

export function sendPasswordReset(to: string, name: string, link: string) {
  const text = `Hi ${name},\n\nUse this link to choose a new password (valid for 1 hour):\n${link}\n\nIf you did not ask for this, ignore this email. Your password is unchanged.\n`;
  return send(
    to,
    'Reset your Pearl Admin password',
    text,
    layout('Reset your password', name, 'We received a request to reset your password. The link below is valid for one hour.', 'Choose a new password', link, 'This link works once. If you did not request a reset, ignore this email and your password stays the same.'),
  );
}
