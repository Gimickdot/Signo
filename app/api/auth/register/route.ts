import { NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { hashPassword } from 'lib/auth-utils';
import { generateOTP, sendVerificationEmail } from 'lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, school } = body;

    if (!email || !password || !name || !school) {
      return NextResponse.json(
        { error: 'Kulang ang mga kinakailangang impormasyon (Missing fields).' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Mangyaring maglagay ng valid na email address (halimbawa: guro@gmail.com).' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ang email na ito ay rehistrado na. (Email already registered).' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = hashPassword(password);

    // Create user (unverified by default)
    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash: hashedPassword,
        name,
        school: school || 'Philippine School For the Deaf - Pasay',
        role: 'GURO', // Default role is GURO
        emoji: '👧',
        isVerified: false,
      },
    });

    // Delete old tokens for clean state
    await prisma.verificationToken.deleteMany({
      where: { email: cleanEmail },
    });

    // Generate 6-digit OTP code & 15 min expiration
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        email: cleanEmail,
        code,
        expiresAt,
      },
    });

    // Send verification email via Nodemailer/Google SMTP
    const emailResult = await sendVerificationEmail(cleanEmail, code, name);

    return NextResponse.json(
      {
        success: true,
        requiresVerification: true,
        email: cleanEmail,
        message: emailResult.simulated
          ? 'Matagumpay na rehistrasyon! Na-log ang 6-digit verification code sa terminal console.'
          : 'Matagumpay na rehistrasyon! Naipadala na ang verification code sa iyong Gmail account.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'May naganap na error sa pagrehistro. (Error registering user)' },
      { status: 500 }
    );
  }
}
