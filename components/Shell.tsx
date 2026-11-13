import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { Inbox, LayoutDashboard, LogOut, Plus, Search, UserCog, Users } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { logoutAction } from '@/app/actions/auth';
import { btnGold } from './ui';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Inquiries', icon: Inbox },
  { href: '/clients', label: 'Clients', icon: Users },
];

export default async function Shell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const nav = user.role === 'owner' ? [...NAV, { href: '/team', label: 'Team', icon: UserCog }] : NAV;

  return (
    <div className="flex-1 flex flex-col md:flex-row">
      <aside className="md:w-60 md:min-h-screen md:sticky md:top-0 md:self-start md:h-screen bg-navy-dark text-gray-300 flex md:flex-col">
        <div className="hidden md:block h-0.5 bg-linear-to-r from-gold via-gold-light to-gold absolute inset-x-0 top-0" />
        <div className="flex md:flex-col flex-1 gap-3 md:gap-0 p-3 md:p-5 items-center md:items-stretch overflow-x-auto">
          <Link href="/" className="flex items-center gap-2.5 md:mb-6 shrink-0">
            <Image src="/logo.png" alt="" width={36} height={36} className="h-9 w-auto rounded-sm" />
            <div className="leading-tight">
              <p className="font-serif text-lg font-black text-white">The Pearl</p>
              <p className="hidden md:block text-[10px] font-semibold tracking-[0.25em] uppercase text-gold">Admin</p>
            </div>
          </Link>

          <form action="/leads" className="hidden md:block relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" aria-hidden />
            <input
              name="q"
              type="search"
              placeholder="Find name, phone, email"
              aria-label="Search inquiries"
              className="w-full bg-navy hover:bg-navy-light focus:bg-white focus:text-gray-800 rounded-sm pl-8 pr-2 py-2 text-sm placeholder-gray-400 outline-none"
            />
          </form>

          <Link href="/leads/new" className={`${btnGold} md:mb-5 shrink-0`}>
            <Plus className="h-4 w-4" aria-hidden /> <span>New inquiry</span>
          </Link>

          <nav className="flex md:flex-col gap-1 md:flex-1">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm hover:bg-white/5 hover:text-white whitespace-nowrap"
              >
                <Icon className="h-4 w-4 text-gold" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>

          <div className="md:border-t md:border-white/10 md:pt-4 flex md:flex-col items-center md:items-stretch gap-2 shrink-0">
            <div className="hidden md:block text-sm leading-tight">
              <p className="text-white font-semibold truncate">{user.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user.role}</p>
            </div>
            <form action={logoutAction}>
              <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-2 py-1.5">
                <LogOut className="h-4 w-4" aria-hidden /> Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 sm:p-8 max-w-6xl w-full mx-auto">
        <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>{children}</Suspense>
      </main>
    </div>
  );
}
