'use client';

import { useActionState, useState } from 'react';
import { createLeadAction } from '@/app/actions/leads';
import ConsultationFields from '@/components/ConsultationFields';
import SubmitButton from '@/components/SubmitButton';
import { Card, Field, Notice, inputClass } from '@/components/ui';
import { SERVICES, SOURCES } from '@/lib/constants';

export default function NewLeadForm({
  users,
  defaultHeldAt,
  currentUserId,
}: {
  users: { id: string; name: string }[];
  defaultHeldAt: string;
  currentUserId: string;
}) {
  const [state, action] = useActionState(createLeadAction, null);
  const e = state?.fieldErrors ?? {};
  const v = state?.values ?? {};
  const [withConsultation, setWithConsultation] = useState(true);

  return (
    <form action={action} className="space-y-6">
      {state?.error && <Notice tone="error">{state.error}</Notice>}

      <Card title="Who is asking?">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name" htmlFor="name" error={e.name}>
            <input id="name" name="name" required autoFocus autoComplete="off" defaultValue={v.name} className={inputClass} />
          </Field>
          <Field label="Phone / WhatsApp" htmlFor="phone" error={e.phone}>
            <input id="phone" name="phone" type="tel" autoComplete="off" defaultValue={v.phone} className={inputClass} placeholder="+234 800 000 0000" />
          </Field>
          <Field label="Email" htmlFor="email" error={e.email} optional hint="Not needed to log an inquiry — it is required before a case can be opened.">
            <input id="email" name="email" type="email" autoComplete="off" defaultValue={v.email} className={inputClass} placeholder="name@example.com" />
          </Field>
          <Field label="How did they reach us?" htmlFor="source" error={e.source}>
            <select id="source" name="source" required defaultValue={v.source ?? ''} className={inputClass}>
              <option value="" disabled>Select…</option>
              {Object.entries(SOURCES).filter(([k]) => k !== 'website').map(([k, text]) => (
                <option key={k} value={k}>{text}</option>
              ))}
            </select>
          </Field>
          <Field label="Interested in" htmlFor="service" error={e.service} optional>
            <select id="service" name="service" defaultValue={v.service ?? ''} className={inputClass}>
              <option value="">Not sure yet</option>
              {Object.entries(SERVICES).map(([k, text]) => (
                <option key={k} value={k}>{text}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="What they said" htmlFor="message" optional>
              <textarea id="message" name="message" rows={2} defaultValue={v.message} className={inputClass} />
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Free consultation">
        <label className="flex items-center gap-2.5 text-sm font-semibold text-navy mb-4 cursor-pointer">
          <input
            type="checkbox"
            name="log_consultation"
            checked={withConsultation}
            onChange={(ev) => setWithConsultation(ev.target.checked)}
            className="h-4 w-4 accent-navy"
          />
          Log the consultation now
        </label>
        {withConsultation ? (
          <ConsultationFields users={users} defaultHeldAt={defaultHeldAt} defaultHandler={currentUserId} errors={e} values={v} />
        ) : (
          <p className="text-sm text-gray-500">The inquiry will be saved as “New”. You can add the consultation later from its page.</p>
        )}
      </Card>

      <div className="flex justify-end">
        <SubmitButton>Save inquiry</SubmitButton>
      </div>
    </form>
  );
}
