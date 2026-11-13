// Segment-level Suspense boundary: lets navigations between dashboard pages show instantly
// while each page's session + database reads stream in.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true">
      <div className="h-8 w-56 bg-gray-200 rounded-sm" />
      <div className="h-1 w-12 bg-gold/60" />
      <div className="h-40 bg-white border border-gray-200 rounded-sm" />
    </div>
  );
}
