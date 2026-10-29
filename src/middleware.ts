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

function getDashboardPath(role?: string): string {
  if (role === 'BOOTH_ATTENDANT') return '/attendant';
  if (role === 'PRODUCTION') return '/production';
  return '/admin';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthGuestRoute = pathname === '/login' || pathname === '/register';
  const isAdminRoute = pathname.startsWith('/admin');
  const isAttendantRoute = pathname.startsWith('/attendant');
  const isProductionRoute = pathname.startsWith('/production');
  const isRootRoute = pathname === '/';

  if (!isAdminRoute && !isAttendantRoute && !isProductionRoute && !isAuthGuestRoute && !isRootRoute) {
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

  const isAccessValid = !!accessPayload && (!accessPayload.exp || accessPayload.exp > nowInSeconds);
  const isRefreshValid = !!refreshPayload && (!refreshPayload.exp || refreshPayload.exp > nowInSeconds);
  const isAuthenticated = isAccessValid || isRefreshValid;
  const role = accessPayload?.role || refreshPayload?.role;

  // Redirect authenticated users away from /login, /register, and /
  if (isAuthGuestRoute || isRootRoute) {
    if (isAuthenticated && role) {
      return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
    }
    if (pathname === '/register') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // If neither token is valid, redirect to login
  if (!isAuthenticated || !role) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;
  }

  // Role Based Route Guards
  if (isAdminRoute && role !== 'ADMIN' && role !== 'OPERATIONAL_ADMIN') {
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }

  if (isAttendantRoute && role !== 'BOOTH_ATTENDANT') {
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }

  if (isProductionRoute && role !== 'PRODUCTION') {
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/attendant/:path*', '/production/:path*', '/login', '/register', '/'],
};
