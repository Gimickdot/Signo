import { NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Kulang ang email o verification code.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    // Find valid token
    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        email: cleanEmail,
        code: cleanCode,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'Maling verification code. Paki-check ang iyong email.' },
        { status: 400 }
      );
    }

    if (tokenRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Nag-expire na ang verification code. Pindutin ang "Resend Code" para magpadala ng bago.' },
        { status: 400 }
      );
    }

    // Mark user as verified
    const user = await prisma.user.update({
      where: { email: cleanEmail },
      data: { isVerified: true },
    });

    // Delete used tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { email: cleanEmail },
    });

    return NextResponse.json({
      success: true,
      message: 'Matagumpay na na-veripika ang iyong account!',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        school: user.school,
        role: user.role,
        emoji: user.emoji,
        profileIcon: user.profileIcon,
        profileBgColor: user.profileBgColor,
      },
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json(
      { error: 'May naganap na error sa pag-verify ng account.' },
      { status: 500 }
    );
  }
}
