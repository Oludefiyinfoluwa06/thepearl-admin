'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { findActiveUserName } from '@/lib/users';
import { OUTCOMES, SERVICES, SOURCES, type Outcome } from '@/lib/constants';
import { addConsultation, createLead, getLead, updateLeadContact } from '@/lib/leads';
import { inputToIso } from '@/lib/format';
import { isValidEmail, normalizeEmail } from '@/lib/validation';
import { str, values, type FormState } from './shared';

const BAD_EMAIL = 'Enter a valid email address, like name@example.com — or leave it blank for now.';

/** Parses the consultation block shared by "new inquiry" and "add consultation". */
async function parseConsultation(data: FormData, fieldErrors: Record<string, string>, fallbackHandler: string) {
  const outcome = str(data, 'outcome') as Outcome;
  if (!(outcome in OUTCOMES)) fieldErrors.outcome = 'Pick an outcome.';
  const heldAt = inputToIso(str(data, 'held_at'));
  if (!heldAt) fieldErrors.held_at = 'Enter the date and time of the consultation.';

  const handledBy = str(data, 'handled_by', 40) || fallbackHandler;
  if (!(await findActiveUserName(handledBy))) fieldErrors.handled_by = 'Choose who handled it.';

  const followUp = str(data, 'follow_up_on');
  if (outcome === 'follow_up_later' && followUp && !/^\d{4}-\d{2}-\d{2}$/.test(followUp)) {
    fieldErrors.follow_up_on = 'Enter a valid date.';
  }
  return {
    heldAt: heldAt ?? '',
    handledBy,
    notes: str(data, 'notes', 5000) || null,
    outcome,
    followUpOn: outcome === 'follow_up_later' && followUp ? followUp : null,
  };
}

export async function createLeadAction(_: FormState, data: FormData): Promise<FormState> {
  const user = await requireUser();
  const fieldErrors: Record<string, string> = {};

  const name = str(data, 'name', 100);
  const phone = str(data, 'phone', 40) || null;
  const emailRaw = str(data, 'email', 200);
  const source = str(data, 'source');
  const service = str(data, 'service');

  if (!name) fieldErrors.name = 'Enter their name.';
  if (!phone && !emailRaw) fieldErrors.phone = 'Add a phone / WhatsApp number or an email so we can reach them.';
  // Email is optional at this stage (WhatsApp inquiries often have none) but must be well-formed if given.
  if (emailRaw && !isValidEmail(emailRaw)) fieldErrors.email = BAD_EMAIL;
  if (!(source in SOURCES)) fieldErrors.source = 'Where did this inquiry come from?';
  if (service && !(service in SERVICES)) fieldErrors.service = 'Choose a service from the list.';

  const withConsultation = data.get('log_consultation') === 'on';
  const consultation = withConsultation ? await parseConsultation(data, fieldErrors, user.id) : null;

  if (Object.keys(fieldErrors).length) {
    return { error: 'Please fix the highlighted fields.', fieldErrors, values: values(data) };
  }

  const id = await createLead(
    {
        name,
        phone,
        email: emailRaw ? normalizeEmail(emailRaw) : null,
        source,
        service: service || null,
        message: str(data, 'message', 5000) || null,
      },
    user,
  );
  if (consultation) await addConsultation(id, consultation, user);
  redirect(`/leads/${id}?created=1`);
}

export async function addConsultationAction(leadId: string, _: FormState, data: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!(await getLead(leadId))) return { error: 'That inquiry no longer exists.' };

  const fieldErrors: Record<string, string> = {};
  const consultation = await parseConsultation(data, fieldErrors, user.id);
  if (Object.keys(fieldErrors).length) {
    return { error: 'Please fix the highlighted fields.', fieldErrors, values: values(data) };
  }
  await addConsultation(leadId, consultation, user);
  redirect(`/leads/${leadId}?saved=1`);
}

export async function updateLeadContactAction(leadId: string, _: FormState, data: FormData): Promise<FormState> {
  const user = await requireUser();
  const lead = await getLead(leadId);
  if (!lead) return { error: 'That inquiry no longer exists.' };

  const fieldErrors: Record<string, string> = {};
  const name = str(data, 'name', 100);
  const phone = str(data, 'phone', 40) || null;
  const emailRaw = str(data, 'email', 200);
  if (!name) fieldErrors.name = 'Enter their name.';
  if (emailRaw && !isValidEmail(emailRaw)) fieldErrors.email = BAD_EMAIL;
  if (lead.client_id && !emailRaw) fieldErrors.email = 'This person is already a client, so an email is required.';
  if (Object.keys(fieldErrors).length) return { error: 'Please fix the highlighted fields.', fieldErrors, values: values(data) };

  await updateLeadContact(leadId, { name, phone, email: emailRaw ? normalizeEmail(emailRaw) : null }, user);
  redirect(`/leads/${leadId}?saved=1`);
}
