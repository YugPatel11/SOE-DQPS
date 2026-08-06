import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyOtpSchema } from '@/lib/validators';
import { createAccessToken, createRefreshToken, setAuthCookies, getClientIp, getUserAgent } from '@/lib/auth';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = verifyOtpSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, code } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Find latest unexpired, unverified OTP for this email
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        email: normalizedEmail,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, error: 'OTP expired or not found. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check attempts (max 5)
    if (otpRecord.attempts >= 5) {
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { verified: true },
      });
      return NextResponse.json(
        { success: false, error: 'Too many incorrect attempts. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // Verify OTP
    if (otpRecord.code !== code) {
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });
      return NextResponse.json(
        { success: false, error: `Incorrect OTP. ${4 - otpRecord.attempts} attempts remaining.` },
        { status: 400 }
      );
    }

    // Mark OTP as verified
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account not found or disabled.' },
        { status: 403 }
      );
    }

    // Invalidate existing active sessions for this user (one session per user)
    await prisma.session.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false },
    });

    // Create session
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

    // Set cookies
    await setAuthCookies(accessToken, refreshToken);

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          rollNo: user.rollNo,
        },
        redirectUrl: user.role === 'SUPERADMIN' ? '/admin' : '/student',
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
