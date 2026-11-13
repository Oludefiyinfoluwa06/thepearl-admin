'use client';

import { useState } from 'react';
import { OUTCOMES } from '@/lib/constants';
import { Field, inputClass } from './ui';

type Props = {
  users: { id: string; name: string }[];
  defaultHeldAt: string;
  defaultHandler: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

/** Date, handler, notes, outcome (+ follow-up date). Shared by "new inquiry" and "add consultation". */
export default function ConsultationFields({ users, defaultHeldAt, defaultHandler, errors = {}, values = {} }: Props) {
  const [outcome, setOutcome] = useState(values.outcome ?? '');
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Date & time" htmlFor="held_at" error={errors.held_at} hint="West Africa Time">
          <input id="held_at" name="held_at" type="datetime-local" required defaultValue={values.held_at ?? defaultHeldAt} className={inputClass} />
        </Field>
        <Field label="Handled by" htmlFor="handled_by" error={errors.handled_by}>
          <select id="handled_by" name="handled_by" defaultValue={values.handled_by ?? defaultHandler} className={inputClass}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Notes" htmlFor="notes" optional>
        <textarea id="notes" name="notes" rows={3} defaultValue={values.notes} className={inputClass} placeholder="What did they want, what was advised…" />
      </Field>

      <fieldset>
        <legend className="block text-xs font-bold tracking-[0.12em] uppercase text-gray-600 mb-1.5">Outcome</legend>
        <div className="grid sm:grid-cols-3 gap-2">
          {Object.entries(OUTCOMES).map(([key, text]) => (
            <label
              key={key}
              className={`flex items-center gap-2 border rounded-sm px-3 py-2.5 text-sm cursor-pointer ${
                outcome === key ? 'border-navy bg-navy/5 font-bold text-navy' : 'border-gray-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="outcome"
                value={key}
                required
                checked={outcome === key}
                onChange={() => setOutcome(key)}
                className="accent-navy"
              />
              {text}
            </label>
          ))}
        </div>
        {errors.outcome && <p role="alert" className="mt-1.5 text-xs font-semibold text-red-700">{errors.outcome}</p>}
      </fieldset>

      {outcome === 'follow_up_later' && (
        <Field label="Follow up on" htmlFor="follow_up_on" error={errors.follow_up_on} optional>
          <input id="follow_up_on" name="follow_up_on" type="date" defaultValue={values.follow_up_on} className={`${inputClass} sm:max-w-56`} />
        </Field>
      )}
    </div>
  );
}
