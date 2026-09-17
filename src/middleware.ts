import { NextResponse, type NextRequest } from 'next/server';

// Helper to decode JWT payload safely in Edge middleware
function parseJwtPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected route paths
  const isAdminRoute = pathname.startsWith('/admin');
  const isAttendantRoute = pathname.startsWith('/attendant');
  const isProductionRoute = pathname.startsWith('/production');

  if (!isAdminRoute && !isAttendantRoute && !isProductionRoute) {
    return NextResponse.next();
  }

  // Retrieve token from cookie or Authorization header
  const tokenCookie = request.cookies.get('access_token');
  const token = tokenCookie?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = parseJwtPayload(token);
  if (!payload) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check token expiration
  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowInSeconds) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('access_token');
    return response;
  }

  const role = payload.role;

  // Role Based Route Guards
  if (isAdminRoute && role !== 'ADMIN') {
    if (role === 'BOOTH_ATTENDANT') return NextResponse.redirect(new URL('/attendant', request.url));
    if (role === 'PRODUCTION') return NextResponse.redirect(new URL('/production', request.url));
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAttendantRoute && role !== 'BOOTH_ATTENDANT') {
    if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
    if (role === 'PRODUCTION') return NextResponse.redirect(new URL('/production', request.url));
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isProductionRoute && role !== 'PRODUCTION') {
    if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
    if (role === 'BOOTH_ATTENDANT') return NextResponse.redirect(new URL('/attendant', request.url));
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/attendant/:path*', '/production/:path*'],
};
