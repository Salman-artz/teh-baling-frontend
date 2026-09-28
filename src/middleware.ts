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

  const nowInSeconds = Math.floor(Date.now() / 1000);

  // Retrieve tokens from cookies
  const tokenCookie = request.cookies.get('access_token');
  const refreshCookie = request.cookies.get('refresh_token');

  const accessToken = tokenCookie?.value;
  const refreshToken = refreshCookie?.value;

  const accessPayload = accessToken ? parseJwtPayload(accessToken) : null;
  const refreshPayload = refreshToken ? parseJwtPayload(refreshToken) : null;

  const isAccessValid = accessPayload && (!accessPayload.exp || accessPayload.exp > nowInSeconds);
  const isRefreshValid = refreshPayload && (!refreshPayload.exp || refreshPayload.exp > nowInSeconds);

  // If neither token is valid, redirect to login
  if (!isAccessValid && !isRefreshValid) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;
  }

  const role = accessPayload?.role || refreshPayload?.role;
  if (!role) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role Based Route Guards
  if (isAdminRoute && role !== 'ADMIN' && role !== 'OPERATIONAL_ADMIN') {
    if (role === 'BOOTH_ATTENDANT') return NextResponse.redirect(new URL('/attendant', request.url));
    if (role === 'PRODUCTION') return NextResponse.redirect(new URL('/production', request.url));
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAttendantRoute && role !== 'BOOTH_ATTENDANT') {
    if (role === 'ADMIN' || role === 'OPERATIONAL_ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
    if (role === 'PRODUCTION') return NextResponse.redirect(new URL('/production', request.url));
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isProductionRoute && role !== 'PRODUCTION') {
    if (role === 'ADMIN' || role === 'OPERATIONAL_ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
    if (role === 'BOOTH_ATTENDANT') return NextResponse.redirect(new URL('/attendant', request.url));
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/attendant/:path*', '/production/:path*'],
};
