import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { listLeads } from '@/lib/leads';
import { LEAD_STATUSES, SOURCES, label } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { Badge, Card, Empty, PageHeader, btnGhost, btnPrimary, inputClass } from '@/components/ui';

export const metadata = { title: 'Inquiries — The Pearl Admin' };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');
  const q = one('q');
  const status = one('status');
  const source = one('source');
  const leads = await listLeads({ q, status, source });
  const filtered = Boolean(q || status || source);

  return (
    <>
      <PageHeader
        title="Inquiries"
        subtitle={`${leads.length}${leads.length === 200 ? '+' : ''} ${filtered ? 'matching' : 'total'}`}
        actions={
          <Link href="/leads/new" className={btnPrimary}>
            <Plus className="h-4 w-4" aria-hidden /> New inquiry
          </Link>
        }
      />

      <form className="flex flex-wrap gap-3 mb-4">
        <input name="q" type="search" defaultValue={q} placeholder="Name, phone or email" aria-label="Search" className={`${inputClass} sm:w-72`} />
        <select name="status" defaultValue={status} aria-label="Status" className={`${inputClass} sm:w-52`}>
          <option value="">Any status</option>
          {Object.entries(LEAD_STATUSES).map(([k, text]) => (
            <option key={k} value={k}>{text}</option>
          ))}
        </select>
        <select name="source" defaultValue={source} aria-label="Source" className={`${inputClass} sm:w-44`}>
          <option value="">Any source</option>
          {Object.entries(SOURCES).map(([k, text]) => (
            <option key={k} value={k}>{text}</option>
          ))}
        </select>
        <button className={btnPrimary}>Search</button>
        {filtered && <Link href="/leads" className={btnGhost}>Clear</Link>}
      </form>

      <Card>
        {leads.length === 0 ? (
          <Empty>{filtered ? 'No inquiries match that search.' : 'No inquiries yet.'}</Empty>
        ) : (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.12em] text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-3 font-bold">Name</th>
                  <th className="px-3 py-3 font-bold">Contact</th>
                  <th className="px-3 py-3 font-bold">Source</th>
                  <th className="px-3 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold">Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link href={`/leads/${l.id}`} className="font-bold text-navy hover:text-gold">{l.name}</Link>
                      {l.client_id && <span className="ml-2 text-[11px] font-bold uppercase tracking-wide text-gold">Client</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      <div>{l.phone ?? '—'}</div>
                      <div className="text-xs text-gray-400">{l.email ?? 'no email yet'}</div>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{label(SOURCES, l.source)}</td>
                    <td className="px-3 py-3"><Badge kind={l.status}>{label(LEAD_STATUSES, l.status)}</Badge></td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
