import { NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { generateOTP, sendPasswordResetEmail } from 'lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Mangyaring maglagay ng email address.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Hindi rehistrado ang account na ito. (Account not registered).' },
        { status: 404 }
      );
    }

    // Delete old verification/reset tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { email: cleanEmail },
    });

    // Generate 6-digit OTP code & 15-minute expiration
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        email: cleanEmail,
        code,
        expiresAt,
      },
    });

    // Send reset email via Nodemailer/SMTP (or fallback to console)
    const emailResult = await sendPasswordResetEmail(cleanEmail, code, user.name);

    return NextResponse.json({
      success: true,
      email: cleanEmail,
      message: emailResult.simulated
        ? 'Na-log ang 6-digit password reset code sa terminal console.'
        : 'Naipadala na ang password reset code sa iyong email account.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'May naganap na error sa pagproseso ng password reset.' },
      { status: 500 }
    );
  }
}
