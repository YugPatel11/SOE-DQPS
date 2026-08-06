import { NextResponse, type NextRequest } from 'next/server';
import { verifyAccessToken, verifyRefreshToken, createAccessToken } from '@/lib/auth';

// Routes that don't require authentication
const publicRoutes = ['/login', '/verify', '/api/auth/login', '/api/auth/verify'];
const publicPathPrefixes = ['/api/auth/', '/_next/', '/favicon.ico'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.includes(pathname)) return NextResponse.next();
  if (publicPathPrefixes.some((prefix) => pathname.startsWith(prefix))) return NextResponse.next();

  // Root redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check access token
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  if (!accessToken && !refreshToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify access token
  let payload = accessToken ? await verifyAccessToken(accessToken) : null;

  // If access token is expired, try refreshing
  if (!payload && refreshToken) {
    const refreshPayload = await verifyRefreshToken(refreshToken);
    if (refreshPayload) {
      // Create new access token
      const newAccessToken = await createAccessToken({
        userId: refreshPayload.userId,
        email: refreshPayload.email,
        role: refreshPayload.role,
        sessionId: refreshPayload.sessionId,
      });

      payload = await verifyAccessToken(newAccessToken);

      if (payload) {
        const response = NextResponse.next();
        response.cookies.set('access_token', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 15 * 60,
        });
        // Set header for downstream use
        response.headers.set('x-user-id', payload.userId);
        response.headers.set('x-user-role', payload.role);
        response.headers.set('x-user-email', payload.email);

        // RBAC enforcement
        const rbacResult = enforceRbac(pathname, payload.role);
        if (rbacResult) return rbacResult;

        return response;
      }
    }

    // Refresh failed
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;
  }

  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // RBAC enforcement
  const rbacResult = enforceRbac(pathname, payload.role);
  if (rbacResult) return rbacResult;

  // Add user info to headers for downstream use
  const response = NextResponse.next();
  response.headers.set('x-user-id', payload.userId);
  response.headers.set('x-user-role', payload.role);
  response.headers.set('x-user-email', payload.email);

  return response;
}

function enforceRbac(pathname: string, role: string): NextResponse | null {
  // Admin routes - only SUPERADMIN
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (role !== 'SUPERADMIN') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/student', '/'));
    }
  }

  // Student routes - only STUDENT
  if (pathname.startsWith('/student') || pathname.startsWith('/api/student')) {
    if (role !== 'STUDENT') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'Forbidden: Student access required' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/admin', '/'));
    }
  }

  return null;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
