import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { listClients } from '@/lib/clients';
import { formatDate } from '@/lib/format';
import { Card, Empty, PageHeader, btnGhost, btnPrimary, inputClass } from '@/components/ui';

export const metadata = { title: 'Clients — The Pearl Admin' };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : '';
  const clients = await listClients(q);

  return (
    <>
      <PageHeader title="Clients" subtitle="Clients are created when a case is opened for an inquiry." />
      <form className="flex flex-wrap gap-3 mb-4">
        <input name="q" type="search" defaultValue={q} placeholder="Name, phone or email" aria-label="Search" className={`${inputClass} sm:w-72`} />
        <button className={btnPrimary}>Search</button>
        {q && <Link href="/clients" className={btnGhost}>Clear</Link>}
      </form>
      <Card>
        {clients.length === 0 ? (
          <Empty>{q ? 'No clients match that search.' : 'No clients yet.'}</Empty>
        ) : (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.12em] text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-3 font-bold">Name</th>
                  <th className="px-3 py-3 font-bold">Email</th>
                  <th className="px-3 py-3 font-bold">Phone</th>
                  <th className="px-3 py-3 font-bold">Cases</th>
                  <th className="px-5 py-3 font-bold">Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3"><Link href={`/clients/${c.id}`} className="font-bold text-navy hover:text-gold">{c.full_name}</Link></td>
                    <td className="px-3 py-3 text-gray-600">{c.email}</td>
                    <td className="px-3 py-3 text-gray-600">{c.phone ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-600">{c.case_count}</td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(c.created_at)}</td>
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
