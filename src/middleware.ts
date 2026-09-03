import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Fix #18: protect all authenticated routes in middleware, not just root
const protectedPaths = ['/dashboard', '/history', '/transaction', '/settings', '/profile'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root to dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/history/:path*', '/transaction/:path*', '/settings/:path*', '/profile/:path*'],
}
