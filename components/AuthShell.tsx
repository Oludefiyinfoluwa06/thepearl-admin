import Image from 'next/image';

/** Centered navy card used by the sign-in, forgot-password and set-password pages. */
export default function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex-1 flex items-center justify-center bg-navy-dark px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Image src="/logo.png" alt="" width={48} height={48} className="h-12 w-auto rounded-sm" />
          <div className="leading-tight">
            <p className="font-serif text-2xl font-black text-white">The Pearl</p>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold">Admin Dashboard</p>
          </div>
        </div>
        <div className="bg-white rounded-sm border-t-4 border-gold p-7 shadow-2xl">
          <h1 className="font-serif text-xl font-bold text-navy mb-5">{title}</h1>
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-gray-500">Staff access only</p>
      </div>
    </main>
  );
}
