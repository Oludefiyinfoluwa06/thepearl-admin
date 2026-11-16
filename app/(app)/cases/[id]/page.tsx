import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { caseTimeline, getCase } from '@/lib/cases';
import { CASE_STATUSES, SERVICES, label } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import SubmitButton from '@/components/SubmitButton';
import Timeline from '@/components/Timeline';
import { Badge, Card, PageHeader, btnPrimary, inputClass, labelClass } from '@/components/ui';
import { addCaseNoteAction, updateCaseStatusAction } from '@/app/actions/cases';

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();
  const timeline = await caseTimeline(c.id);

  return (
    <>
      <PageHeader
        title={label(SERVICES, c.service)}
        subtitle={
          <>
            <Badge kind={c.status}>{label(CASE_STATUSES, c.status)}</Badge>{' '}
            <span className="ml-1">
              for <Link href={`/clients/${c.client_id}`} className="font-bold text-navy hover:text-gold">{c.client_name}</Link> · opened {formatDateTime(c.opened_at)} by {c.opened_by_name}
            </span>
          </>
        }
      />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Add a note">
            <form action={addCaseNoteAction.bind(null, c.id)} className="space-y-3">
              <label htmlFor="note" className="sr-only">Note</label>
              <textarea id="note" name="note" rows={3} required className={inputClass} placeholder="What happened, what is needed next…" />
              <SubmitButton>Save note</SubmitButton>
            </form>
          </Card>
          <Card title="Activity">
            <Timeline events={timeline} />
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Status">
            <form action={updateCaseStatusAction.bind(null, c.id)} className="space-y-3">
              <label htmlFor="status" className={labelClass}>Move this case to</label>
              <select id="status" name="status" defaultValue={c.status} className={inputClass}>
                {Object.entries(CASE_STATUSES).map(([k, text]) => (
                  <option key={k} value={k}>{text}</option>
                ))}
              </select>
              <button className={btnPrimary}>Update status</button>
            </form>
          </Card>
          <Card title="Details">
            <dl className="text-sm space-y-3">
              <div><dt className="text-xs font-bold tracking-[0.12em] uppercase text-gray-500">Client email</dt><dd className="break-all">{c.client_email}</dd></div>
              {c.notes && <div><dt className="text-xs font-bold tracking-[0.12em] uppercase text-gray-500">Opening notes</dt><dd className="whitespace-pre-wrap">{c.notes}</dd></div>}
              {c.lead_id && <div><dt className="text-xs font-bold tracking-[0.12em] uppercase text-gray-500">Original inquiry</dt><dd><Link href={`/leads/${c.lead_id}`} className="font-bold text-navy hover:text-gold">View inquiry →</Link></dd></div>}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
