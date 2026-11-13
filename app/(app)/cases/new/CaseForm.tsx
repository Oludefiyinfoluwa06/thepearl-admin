'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { checkEmailAction, openCaseAction, type EmailCheck } from '@/app/actions/cases';
import SubmitButton from '@/components/SubmitButton';
import { Field, Notice, inputClass } from '@/components/ui';
import { SERVICES } from '@/lib/constants';
import { isValidEmail } from '@/lib/validation';

type Props = {
  target: { leadId?: string; clientId?: string };
  /** Set when the person already has a client profile (so the email is already on file). */
  client: { id: string; name: string; email: string } | null;
  personName: string;
  initialEmail: string;
  defaultService: string;
};

export default function CaseForm({ target, client, personName, initialEmail, defaultService }: Props) {
  const [state, action] = useActionState(openCaseAction.bind(null, target), null);
  const e = state?.fieldErrors ?? {};
  const v = state?.values ?? {};

  const [email, setEmail] = useState(v.email ?? initialEmail);
  const [checked, setChecked] = useState<{ email: string; result: EmailCheck } | null>(null);
  // Ignore a result that belongs to an older value of the field.
  const check = checked && checked.email === email ? checked.result : null;
  const [resolution, setResolution] = useState(v.resolution ?? '');

  // Debounced server-side check: format + "does another client already own this email?"
  useEffect(() => {
    if (client) return;
    if (!isValidEmail(email)) return;
    let stale = false;
    const t = setTimeout(async () => {
      const result = await checkEmailAction(email);
      if (!stale) setChecked({ email, result });
    }, 350);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [email, client]);

  const emailOk = Boolean(client) || isValidEmail(email);
  const duplicates = check?.status === 'duplicate' ? check.clients : [];
  const needsResolution = duplicates.length > 0 && !resolution;
  const showFormatError = !client && email.trim() !== '' && !isValidEmail(email);

  return (
    <form action={action} className="space-y-6 bg-white border border-gray-200 rounded-sm p-5 sm:p-6">
      {state?.error && !e.email && !e.resolution && <Notice tone="error">{state.error}</Notice>}

      {client ? (
        <div className="text-sm bg-gray-50 border border-gray-200 rounded-sm px-4 py-3">
          <p className="font-bold text-navy">{client.name}</p>
          <p className="text-gray-600">{client.email} <span className="text-green-700 font-semibold">· email on file</span></p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-navy/5 border-l-4 border-gold px-4 py-3 text-sm text-navy">
            A case can only be opened once <strong>{personName}</strong> has a valid email address.
          </div>
          <Field
            label="Client email"
            htmlFor="email"
            error={e.email ?? (showFormatError ? 'Enter a valid email address, like name@example.com.' : undefined)}
          >
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="off"
              autoFocus={!initialEmail}
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              aria-invalid={showFormatError || Boolean(e.email)}
              className={inputClass}
              placeholder="name@example.com"
            />
          </Field>

          {duplicates.length > 0 && (
            <fieldset className="border border-amber-300 bg-amber-50 rounded-sm p-4 space-y-3">
              <legend className="px-1 text-sm font-bold text-amber-900">This email already belongs to another client</legend>
              <ul className="text-sm text-amber-900 space-y-1">
                {duplicates.map((d) => (
                  <li key={d.id}>
                    <Link href={`/clients/${d.id}`} target="_blank" className="font-bold underline">{d.full_name}</Link>
                    {d.phone ? ` · ${d.phone}` : ''}
                  </li>
                ))}
              </ul>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input type="radio" name="resolution" value="link" checked={resolution === 'link'} onChange={() => setResolution('link')} className="mt-1 accent-navy" />
                <span><strong>Same person</strong> — add this case to {duplicates[0].full_name}’s existing profile</span>
              </label>
              <input type="hidden" name="link_client_id" value={duplicates[0].id} />
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input type="radio" name="resolution" value="separate" checked={resolution === 'separate'} onChange={() => setResolution('separate')} className="mt-1 accent-navy" />
                <span><strong>Different person</strong> — create a separate client with the same email (e.g. a family sharing one address)</span>
              </label>
              {e.resolution && <p role="alert" className="text-xs font-semibold text-red-700">{e.resolution}</p>}
            </fieldset>
          )}
        </div>
      )}

      <Field label="Type of case" htmlFor="service" error={e.service}>
        <select id="service" name="service" required defaultValue={v.service ?? defaultService} className={inputClass}>
          <option value="" disabled>Select…</option>
          {Object.entries(SERVICES).map(([k, text]) => (
            <option key={k} value={k}>{text}</option>
          ))}
        </select>
      </Field>

      <Field label="Notes" htmlFor="notes" optional>
        <textarea id="notes" name="notes" rows={3} defaultValue={v.notes} className={inputClass} />
      </Field>

      <div className="flex flex-wrap items-center justify-end gap-4">
        {!emailOk && <p className="text-xs text-gray-500">Add a valid email to continue.</p>}
        {emailOk && needsResolution && <p className="text-xs text-gray-500">Choose how to handle the existing email.</p>}
        <SubmitButton disabled={!emailOk || needsResolution} pendingText="Opening…">
          Open case
        </SubmitButton>
      </div>
    </form>
  );
}
