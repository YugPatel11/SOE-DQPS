import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { createAccessToken, createRefreshToken, setAuthCookies, getClientIp, getUserAgent } from '@/lib/auth';
import { nanoid } from 'nanoid';

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Handle Google OAuth errors
    if (error) {
      return NextResponse.redirect(`${appUrl}/login?error=google_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${appUrl}/login?error=invalid_callback`);
    }

    // Verify CSRF state
    const cookieStore = await cookies();
    const savedState = cookieStore.get('oauth_state')?.value;
    cookieStore.delete('oauth_state');

    if (!savedState || savedState !== state) {
      return NextResponse.redirect(`${appUrl}/login?error=invalid_state`);
    }

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('Google token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(`${appUrl}/login?error=token_exchange_failed`);
    }

    const tokens: GoogleTokenResponse = await tokenRes.json();

    // Fetch user info from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      console.error('Google userinfo fetch failed:', await userInfoRes.text());
      return NextResponse.redirect(`${appUrl}/login?error=userinfo_failed`);
    }

    const googleUser: GoogleUserInfo = await userInfoRes.json();
    const normalizedEmail = googleUser.email.toLowerCase().trim();

    // Check email domain restriction
    const domain = process.env.ALLOWED_EMAIL_DOMAIN;
    if (domain && !normalizedEmail.endsWith(`@${domain}`)) {
      return NextResponse.redirect(`${appUrl}/login?error=domain_restricted`);
    }

    // Find user in database (must be pre-registered in roster)
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.redirect(`${appUrl}/login?error=not_registered`);
    }

    if (!user.isActive) {
      return NextResponse.redirect(`${appUrl}/login?error=account_disabled`);
    }

    // Invalidate existing active sessions
    await prisma.session.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false },
    });

    // Create session (same logic as old verify route)
    const sessionId = nanoid(32);
    const ip = getClientIp(request);
    const ua = getUserAgent(request);

    const accessToken = await createAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    });

    const refreshToken = await createRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    });

    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress: ip,
        userAgent: ua,
        isActive: true,
      },
    });

    // Set auth cookies
    await setAuthCookies(accessToken, refreshToken);

    // Redirect to dashboard based on role
    const redirectUrl = user.role === 'SUPERADMIN' ? '/admin' : '/student';
    return NextResponse.redirect(`${appUrl}${redirectUrl}`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}/login?error=server_error`);
  }
}
