import { NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    let whereClause: any = {};
    if (teacherId && teacherId !== 'ALL') {
      whereClause.teacherId = teacherId;
    }

    let students = await prisma.student.findMany({
      where: whereClause,
      include: {
        progress: true,
        sessions: true,
        teacher: true,
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
        teacherName: s.teacher ? s.teacher.name : 'Unassigned',
        teacherEmail: s.teacher ? s.teacher.email : '',
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

    const cleanName = name.trim();

    // Verify teacher exists
    let teacher = await prisma.user.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      // Fallback if needed
      teacher = await prisma.user.findFirst({ where: { role: 'GURO' } });
      if (!teacher) {
        return NextResponse.json({ error: 'Hindi nahanap ang teacher account. Magdagdag muna ng guro.' }, { status: 404 });
      }
    }

    // Enforce student uniqueness per handling teacher
    const existingStudent = await prisma.student.findFirst({
      where: {
        teacherId: teacher.id,
        name: { equals: cleanName, mode: 'insensitive' },
      },
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: `Ang estudyante na si "${cleanName}" ay nakatala na sa gurong si ${teacher.name}.` },
        { status: 400 }
      );
    }

    const student = await prisma.student.create({
      data: {
        name: cleanName,
        grade: grade || 'Grade 1',
        teacherId: teacher.id,
        emoji: emoji || '👧',
        progress: {
          create: [
            { category: 'OVERALL', completed: true, score: parseInt(points, 10) || 0 },
          ],
        },
      },
      include: {
        progress: true,
        teacher: true,
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
        teacherName: student.teacher ? student.teacher.name : teacher.name,
        teacherEmail: student.teacher ? student.teacher.email : teacher.email,
        points: studentPoints,
        emoji: student.emoji || '👧',
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

    const currentStudent = await prisma.student.findUnique({
      where: { id },
    });

    if (!currentStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const cleanName = name.trim();

    // Check if new name conflicts with another student under same teacher
    if (cleanName.toLowerCase() !== currentStudent.name.toLowerCase()) {
      const duplicate = await prisma.student.findFirst({
        where: {
          teacherId: currentStudent.teacherId,
          name: { equals: cleanName, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `Ang estudyante na si "${cleanName}" ay mayroon nang kaparehong pangalan sa klase ng gurong ito.` },
          { status: 400 }
        );
      }
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        name: cleanName,
        grade,
        ...(emoji ? { emoji } : {})
      },
      include: {
        teacher: true,
        progress: true,
      },
    });

    const totalPoints = updatedStudent.progress.reduce((acc, curr) => acc + (curr.category.length === 1 ? 0 : curr.score), 0);

    return NextResponse.json({
      success: true,
      student: {
        id: updatedStudent.id,
        name: updatedStudent.name,
        grade: updatedStudent.grade,
        teacherId: updatedStudent.teacherId,
        teacherName: updatedStudent.teacher?.name || 'Unassigned',
        points: totalPoints,
        emoji: updatedStudent.emoji,
        createdAt: updatedStudent.createdAt,
      },
    });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}
