import { NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { hashPassword } from 'lib/auth-utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code, newPassword } = body;

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { error: 'Kulang ang mga impormasyon. Mangyaring kumpletuhin ang form.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Ang password ay dapat hindi bababa sa 6 characters.' },
        { status: 400 }
      );
    }

    // Check valid verification token
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
        { error: 'Maling reset code. Paki-check ang iyong email o terminal console.' },
        { status: 400 }
      );
    }

    if (tokenRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Nag-expire na ang reset code. Pindutin ang "Resend Code" para magpadala ng bago.' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = hashPassword(newPassword);

    // Update user password and ensure account is verified
    await prisma.user.update({
      where: { email: cleanEmail },
      data: {
        passwordHash: hashedPassword,
        isVerified: true,
      },
    });

    // Delete used tokens
    await prisma.verificationToken.deleteMany({
      where: { email: cleanEmail },
    });

    // Log password reset event in AuditLog
    try {
      await prisma.auditLog.create({
        data: {
          type: 'audit',
          message: `Matagumpay na na-reset ang password para sa user ${cleanEmail}`,
        },
      });
    } catch (logErr) {
      console.warn('Failed to log audit for password reset:', logErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Matagumpay na nabago ang iyong password! Maaari ka nang mag-login gamit ang iyong bagong password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'May naganap na error sa pag-reset ng password.' },
      { status: 500 }
    );
  }
}
