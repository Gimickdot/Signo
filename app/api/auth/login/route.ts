import { NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { verifyPassword, hashPassword } from 'lib/auth-utils';
import { generateOTP, sendVerificationEmail } from 'lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, role } = body;

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Kulang ang email/username o password. (Missing fields).' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Auto-seed a default admin if none exists
    if (role === 'admin' && (cleanEmail === 'admin' || cleanEmail === 'admin@signo.edu.ph')) {
      const adminExists = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });
      if (!adminExists) {
        await prisma.user.create({
          data: {
            email: 'admin',
            passwordHash: hashPassword('admin'),
            name: 'System Administrator',
            school: 'Philippine School For the Deaf - Pasay',
            role: 'ADMIN',
            emoji: '👑',
            isVerified: true,
          },
        });
      }
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Hindi rehistrado ang account na ito. (Account not registered).' },
        { status: 401 }
      );
    }

    // Verify role
    const expectedDbRole = role === 'admin' ? 'ADMIN' : 'GURO';
    if (user.role !== expectedDbRole) {
      return NextResponse.json(
        { error: 'Hindi awtorisado ang account na ito para sa portal na ito. (Unauthorized portal access).' },
        { status: 403 }
      );
    }


    // Verify status
    if (user.status === 'HINDI_AKTIBO') {
      return NextResponse.json(
        { error: 'Ang account na ito ay hindi aktibo. Makipag-ugnayan sa Administrator. (Account is inactive).' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = verifyPassword(password, user.passwordHash || '');
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Maling password. Subukan muli. (Incorrect password).' },
        { status: 401 }
      );
    }

    // Check email verification status (exempt admin user if using fallback 'admin')
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

    // Log successful login event in AuditLog database table
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          type: 'audit',
          message: `${user.name} (${user.role}) -- Matagumpay na nag-login mula sa ${user.school}`,
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
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'May naganap na error sa pag-login. (Error logging in).' },
      { status: 500 }
    );
  }
}
