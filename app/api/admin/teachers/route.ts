import { NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { hashPassword } from 'lib/auth-utils';
import { generateOTP, sendVerificationEmail } from 'lib/email';

export async function GET() {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: 'GURO' },
      include: {
        students: true,
        sessions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedTeachers = teachers.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      school: t.school,
      status: t.status === 'AKTIBO' ? 'Aktibo' : 'Hindi Aktibo',
      studentsCount: t.students.length,
      sessionsCount: t.sessions.length,
      emoji: t.emoji || '👩‍🏫',
      isVerified: t.isVerified,
      createdAt: t.createdAt,
    }));

    return NextResponse.json({ success: true, teachers: formattedTeachers });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, school, password, emoji } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Kailangan ang pangalan, email, at initial password ng guro.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Mangyaring maglagay ng wastong email address.' },
        { status: 400 }
      );
    }

    // Check if teacher already exists
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Ang email na ito ay rehistrado na sa sistema. (Email already registered).' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = hashPassword(password);

    // Create teacher as GURO with isVerified: false
    const teacher = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash: hashedPassword,
        school: school?.trim() || 'Philippine School For the Deaf - Pasay',
        role: 'GURO',
        status: 'AKTIBO',
        emoji: emoji || '👩‍🏫',
        isVerified: false,
      },
    });

    // Delete existing verification tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { email: cleanEmail },
    });

    // Generate 6-digit OTP code & 24 hr expiration
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        email: cleanEmail,
        code,
        expiresAt,
      },
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(cleanEmail, code, teacher.name);

    // Log to AuditLog
    try {
      await prisma.auditLog.create({
        data: {
          userId: teacher.id,
          type: 'audit',
          message: `Admin -- Matagumpay na nagdagdag ng opisyal na guro: ${teacher.name} (${teacher.email})`,
        },
      });
    } catch (logErr) {
      console.warn('Failed to record audit log for add teacher:', logErr);
    }

    const formattedTeacher = {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      school: teacher.school,
      status: 'Aktibo',
      studentsCount: 0,
      sessionsCount: 0,
      emoji: teacher.emoji || '👩‍🏫',
      isVerified: false,
      createdAt: teacher.createdAt,
    };

    return NextResponse.json({
      success: true,
      teacher: formattedTeacher,
      message: emailResult.simulated
        ? 'Matagumpay na naidagdag ang guro! Na-log ang verification code sa server terminal.'
        : 'Matagumpay na naidagdag ang guro! Naipadala na ang verification code sa kanyang email.',
    });
  } catch (error) {
    console.error('Error adding teacher:', error);
    return NextResponse.json({ error: 'Failed to add teacher' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, name, school } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing teacher ID' }, { status: 400 });
    }

    let updateData: any = {};
    if (status) {
      updateData.status = status === 'Aktibo' || status === 'AKTIBO' ? 'AKTIBO' : 'HINDI_AKTIBO';
    }
    if (name) updateData.name = name;
    if (school) updateData.school = school;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, teacher: updatedUser });
  } catch (error) {
    console.error('Error updating teacher:', error);
    return NextResponse.json({ error: 'Failed to update teacher' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing teacher ID' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    return NextResponse.json({ error: 'Failed to delete teacher' }, { status: 500 });
  }
}
