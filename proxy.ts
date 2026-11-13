import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Optimistic check only (cookie present). Real session validation happens in lib/auth.ts next to the data.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has('tptt_admin_session');
  const path = request.nextUrl.pathname;
  // Reachable without signing in: the invitation / reset links must work for people who have no session.
  const isPublic = path === '/login' || path === '/forgot-password' || path === '/set-password';
  if (!hasSession && !isPublic) return NextResponse.redirect(new URL('/login', request.url));
  // Not redirecting signed-in users away from /login here: the cookie may be stale (expired or revoked session),
  // which would loop. The login page checks the real session instead.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/intake|_next/static|_next/image|favicon.ico|logo.png).*)'],
};
