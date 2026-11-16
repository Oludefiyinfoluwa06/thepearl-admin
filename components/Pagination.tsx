import Link from 'next/link';
import { PAGE_SIZE } from '@/lib/constants';
import { btnGhost } from './ui';

/** Previous / Next links that keep the current search and filters. Renders nothing for a single page. */
export default function Pagination({ page, total, path, params }: { page: number; total: number; path: string; params: Record<string, string> }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    if (p > 1) qs.set('page', String(p));
    const s = qs.toString();
    return s ? `${path}?${s}` : path;
  };
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 mt-4 text-sm text-gray-600">
      <span>Page {page} of {pages} · {total} total</span>
      <span className="flex gap-2">
        {page > 1 && <Link href={href(page - 1)} className={btnGhost}>Previous</Link>}
        {page < pages && <Link href={href(page + 1)} className={btnGhost}>Next</Link>}
      </span>
    </nav>
  );
}
