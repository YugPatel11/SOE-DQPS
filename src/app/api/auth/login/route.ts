import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { loginSchema } from '@/lib/validators';
import { generateOtp, sendOtpEmail } from '@/lib/email';
import { rateLimitLogin, rateLimitOtp } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    // Rate limit by IP
    const ipLimit = rateLimitLogin(ip);
    if (!ipLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((ipLimit.resetAt - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { email } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check email domain
    const domain = process.env.ALLOWED_EMAIL_DOMAIN || 'youruniversity.edu.in';
    if (!normalizedEmail.endsWith(`@${domain}`)) {
      return NextResponse.json(
        { success: false, error: `Only @${domain} email addresses are allowed` },
        { status: 400 }
      );
    }

    // Check if user exists in roster (database)
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Your email is not registered in the system. Please contact your administrator.' },
        { status: 403 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Your account has been disabled. Please contact your administrator.' },
        { status: 403 }
      );
    }

    // Rate limit OTP by email
    const otpLimit = rateLimitOtp(normalizedEmail);
    if (!otpLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Too many OTP requests. Please wait before requesting a new code.' },
        { status: 429 }
      );
    }

    // Generate OTP
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate any existing OTPs for this email
    await prisma.otpCode.updateMany({
      where: { email: normalizedEmail, verified: false },
      data: { verified: true },
    });

    // Store OTP
    await prisma.otpCode.create({
      data: {
        email: normalizedEmail,
        code: otp,
        expiresAt,
      },
    });

    // Send OTP email
    const sent = await sendOtpEmail(normalizedEmail, otp, user.name);
    if (!sent) {
      return NextResponse.json(
        { success: false, error: 'Failed to send OTP email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email address',
      data: { email: normalizedEmail, role: user.role },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
