import type { ReactNode } from 'react';

export const inputClass =
  'w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-navy focus:ring-1 focus:ring-navy rounded-sm outline-none transition-colors text-gray-800 text-sm placeholder-gray-400 disabled:bg-gray-100';
export const labelClass = 'block text-xs font-bold tracking-[0.12em] uppercase text-gray-600 mb-1.5';
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 bg-navy hover:bg-navy-light disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 text-xs tracking-[0.15em] uppercase rounded-sm transition-colors';
export const btnGold =
  'inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-light text-navy font-bold px-5 py-2.5 text-xs tracking-[0.15em] uppercase rounded-sm transition-colors';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 border border-gray-300 hover:border-navy text-navy font-bold px-4 py-2.5 text-xs tracking-[0.15em] uppercase rounded-sm transition-colors bg-white';

export function Field({
  label,
  htmlFor,
  error,
  hint,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
        {optional && <span className="ml-2 font-normal normal-case tracking-normal text-gray-400">optional</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function Card({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-sm">
      {title && (
        <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-100">
          <h2 className="font-serif text-lg font-bold text-navy">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        <div className="mt-2 h-0.5 w-12 bg-gold" />
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-sky-50 text-sky-800 border-sky-200',
  moved_to_assessment: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  not_interested: 'bg-gray-100 text-gray-600 border-gray-200',
  follow_up_later: 'bg-amber-50 text-amber-800 border-amber-200',
  open: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

export function Badge({ kind, children }: { kind: string; children: ReactNode }) {
  return (
    <span
      className={`inline-block whitespace-nowrap border rounded-sm px-2 py-0.5 text-[11px] font-bold tracking-wide ${
        STATUS_STYLE[kind] ?? 'bg-gray-100 text-gray-600 border-gray-200'
      }`}
    >
      {children}
    </span>
  );
}

export function Notice({ tone, children }: { tone: 'success' | 'error' | 'warn'; children: ReactNode }) {
  const style = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-700',
    warn: 'bg-amber-50 border-amber-300 text-amber-900',
  }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`border rounded-sm px-4 py-3 text-sm ${style}`}>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-gray-500">{children}</p>;
}
