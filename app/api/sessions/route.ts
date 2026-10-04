import { NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const studentId = searchParams.get('studentId');

    let whereClause: any = {};
    if (teacherId) whereClause.teacherId = teacherId;
    if (studentId) whereClause.studentId = studentId;

    const sessions = await prisma.session.findMany({
      where: whereClause,
      include: {
        teacher: {
          select: { id: true, name: true, email: true },
        },
        student: {
          select: { id: true, name: true, grade: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, teacherId, studentId, accuracy, predictions } = body;

    if (!title || !teacherId) {
      return NextResponse.json({ error: 'Missing session title or teacherId' }, { status: 400 });
    }

    // Verify teacher exists
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher account not found' }, { status: 404 });
    }

    // If studentId provided, verify student exists
    let validStudentId: string | null = null;
    if (studentId) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });
      if (student) validStudentId = student.id;
    }

    const newSession = await prisma.session.create({
      data: {
        title,
        teacherId: teacher.id,
        studentId: validStudentId,
        accuracy: typeof accuracy === 'number' ? accuracy : 100.0,
        predictions: predictions ? predictions : [],
      },
    });

    return NextResponse.json({ success: true, session: newSession });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
