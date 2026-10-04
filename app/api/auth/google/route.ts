import { NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { OAuth2Client } from 'google-auth-library';
import { generateOTP, sendVerificationEmail } from 'lib/email';

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { credential } = body;

    if (!credential) {
      return NextResponse.json(
        { error: 'Walang credential na ibinigay. (No credential provided).' },
        { status: 400 }
      );
    }

    // Verify Google ID Token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    
    if (!payload || !payload.email) {
      return NextResponse.json(
        { error: 'Hindi ma-verify ang Google account. (Cannot verify Google account).' },
        { status: 401 }
      );
    }

    const cleanEmail = payload.email.trim().toLowerCase();
    
    // Find user
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      // Auto-register new user as GURO (Teacher) but DO NOT verify them yet
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: payload.name || 'Guro',
          school: 'Unknown School', // Default value
          role: 'GURO',
          emoji: '👨‍🏫',
          isVerified: false,
        },
      });
    }

    // Check email verification status for existing users (who might not be verified yet)
    if (!user.isVerified && user.role !== 'ADMIN') {
      // Generate OTP and send email
      await prisma.verificationToken.deleteMany({
        where: { email: cleanEmail },
      });

      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.verificationToken.create({
        data: {
          email: cleanEmail,
          code,
          expiresAt,
        },
      });

      const emailResult = await sendVerificationEmail(cleanEmail, code, user.name);

      return NextResponse.json(
        {
          requiresVerification: true,
          email: cleanEmail,
          error: emailResult.simulated
            ? 'Hindi pa na-veripika ang iyong account. Na-log ang 6-digit verification code sa terminal console.'
            : 'Hindi pa na-veripika ang iyong account. Naipadala na ang verification code sa iyong Gmail account.',
        },
        { status: 403 }
      );
    }

    // Log successful login event in AuditLog
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          type: 'audit',
          message: `${user.name} (${user.role}) -- Matagumpay na nag-login gamit ang Google mula sa ${user.school}`,
        },
      });
    } catch (logErr) {
      console.warn('Failed to record audit log:', logErr);
    }

    return NextResponse.json({
      success: true,
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
    console.error('Google Login error:', error);
    return NextResponse.json(
      { error: 'May naganap na error sa pag-login gamit ang Google. (Error logging in with Google).' },
      { status: 500 }
    );
  }
}
