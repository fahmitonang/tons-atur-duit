import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const SESSION_IDLE_TIMEOUT_MS = 6 * 60 * 60 * 1000; // 6 jam
const SESSION_ABSOLUTE_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 jam

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root to dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Validasi token & kedaluwarsa sesi pada seluruh rute terproteksi
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const now = Date.now();
  const loginAt = Number(token?.loginAt || 0);
  const lastActivity = Number(token?.lastActivity || 0);

  const isExpiredOrInvalid =
    !token ||
    !token.id ||
    Boolean(token.expired) ||
    !loginAt ||
    !lastActivity ||
    now - loginAt > SESSION_ABSOLUTE_TIMEOUT_MS ||
    now - lastActivity > SESSION_IDLE_TIMEOUT_MS;

  if (isExpiredOrInvalid) {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    // Hapus cookie sesi yang sudah kedaluwarsa agar bersih
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.session-token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/history/:path*',
    '/transaction/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/wallets/:path*',
    '/savings/:path*',
    '/ai-advisor/:path*',
  ],
};
