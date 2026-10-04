import { NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { generateOTP, sendVerificationEmail } from 'lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Kulang ang email.' },
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
        { error: 'Hindi rehistrado ang account na ito.' },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: 'Na-veripika na ang account na ito. Maaari ka nang mag-login.',
      });
    }

    // Delete old tokens for clean state
    await prisma.verificationToken.deleteMany({
      where: { email: cleanEmail },
    });

    // Generate new OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.verificationToken.create({
      data: {
        email: cleanEmail,
        code,
        expiresAt,
      },
    });

    // Send email
    const emailResult = await sendVerificationEmail(cleanEmail, code, user.name);

    if (!emailResult.success) {
      return NextResponse.json(
        { error: `Hindi maipadala ang email sa ${cleanEmail}. ${emailResult.error || 'Pakisuri ang SMTP settings sa .env.'}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Matagumpay na naipadala ang bagong verification code sa iyong Gmail account.',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json(
      { error: 'May naganap na error sa pagpapadala ng verification code.' },
      { status: 500 }
    );
  }
}
