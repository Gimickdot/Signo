import { NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    let whereClause: any = {};
    if (teacherId) {
      whereClause.teacherId = teacherId;
    }

    let students = await prisma.student.findMany({
      where: whereClause,
      include: {
        progress: true,
        sessions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map output to include computed points & emoji for frontend compatibility
    const formattedStudents = students.map((s) => {
      // Sum all progress scores to calculate total points! (OVERALL stores initial teacher points)
      const totalPoints = s.progress.reduce((acc, curr) => acc + (curr.category.length === 1 ? 0 : curr.score), 0);
      const emoji = s.emoji;
      
      // Determine last mode played from progress history
      const sortedProgress = [...s.progress]
        .filter(p => p.category !== 'OVERALL')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      let lastMode: string | null = null;
      if (sortedProgress.length > 0) {
        const latestCat = sortedProgress[0].category;
        if (latestCat === 'SPELLING_MASTER') {
          lastMode = 'Spelling Game';
        } else {
          // Assume any other category (GREETING, FAMILY, etc.) is Situational Game
          lastMode = 'Situational Game';
        }
      }

      return {
        id: s.id,
        name: s.name,
        grade: s.grade,
        teacherId: s.teacherId,
        points: totalPoints,
        emoji: emoji,
        lastMode: lastMode,
        createdAt: s.createdAt,
      };
    });

    return NextResponse.json({ success: true, students: formattedStudents });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, grade, teacherId, points, emoji } = body;

    if (!name || !teacherId) {
      return NextResponse.json({ error: 'Pangalan at Teacher ID ay kailangan.' }, { status: 400 });
    }

    // Verify teacher exists
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
    });

    let validTeacherId = teacherId;
    if (!teacher) {
      // Fallback to any teacher or create system user if needed
      const firstTeacher = await prisma.user.findFirst({ where: { role: 'GURO' } });
      if (firstTeacher) {
        validTeacherId = firstTeacher.id;
      } else {
        return NextResponse.json({ error: 'Hindi nahanap ang teacher account.' }, { status: 404 });
      }
    }

    const student = await prisma.student.create({
      data: {
        name,
        grade: grade || 'Grade 1',
        teacherId: validTeacherId,
        emoji: emoji || 'dY` ',
        progress: {
          create: [
            { category: 'OVERALL', completed: true, score: parseInt(points, 10) || 0 },
          ],
        },
      },
      include: {
        progress: true,
      },
    });

    // Calculate score
    const studentPoints = student.progress.reduce((acc, curr) => acc + (curr.category.length === 1 ? 0 : curr.score), 0);

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        grade: student.grade,
        teacherId: student.teacherId,
        points: studentPoints,
        emoji: emoji || 'dY` ',
        lastMode: null,
        createdAt: student.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing student ID' }, { status: 400 });
    }

    await prisma.student.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, grade, emoji } = body;

    if (!id || !name || !grade) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        name,
        grade,
        ...(emoji ? { emoji } : {})
      },
    });

    return NextResponse.json({ success: true, student: updatedStudent });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}
