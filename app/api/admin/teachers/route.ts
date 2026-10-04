import { NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';
import { hashPassword } from 'lib/auth-utils';

export async function GET() {
  try {
    let teachers = await prisma.user.findMany({
      where: { role: 'GURO' },
      include: {
        students: true,
        sessions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Auto-seed initial demo teachers if DB table has 0 teachers
    if (teachers.length === 0) {
      const demoTeachers = [
        { name: 'Gng. Reyes', email: 'reyes@gmail.com', school: 'Philippine School For the Deaf - Pasay', status: 'AKTIBO', emoji: '👩‍🏫' },
        { name: 'G. Santos', email: 'santos@gmail.com', school: 'Philippine School For the Deaf - Pasay', status: 'HINDI_AKTIBO', emoji: '👨‍🏫' },
        { name: 'G. Garcia', email: 'garcia@gmail.com', school: 'Philippine School For the Deaf - Pasay', status: 'AKTIBO', emoji: '👩‍🏫' },
      ];

      for (const t of demoTeachers) {
        await prisma.user.create({
          data: {
            name: t.name,
            email: t.email,
            passwordHash: hashPassword('password123'),
            school: t.school,
            role: 'GURO',
            status: t.status as any,
            emoji: t.emoji,
            isVerified: true,
          },
        });
      }

      teachers = await prisma.user.findMany({
        where: { role: 'GURO' },
        include: {
          students: true,
          sessions: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const formattedTeachers = teachers.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      school: t.school,
      status: t.status === 'AKTIBO' ? 'Aktibo' : 'Hindi Aktibo',
      studentsCount: t.students.length,
      sessionsCount: t.sessions.length,
      emoji: t.emoji || '👩‍🏫',
      createdAt: t.createdAt,
    }));

    return NextResponse.json({ success: true, teachers: formattedTeachers });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
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
