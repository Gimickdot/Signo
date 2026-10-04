import { NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const teacherId = searchParams.get('teacherId');

    if (studentId) {
      const studentProgress = await prisma.progress.findMany({
        where: { studentId },
      });
      return NextResponse.json({ success: true, progress: studentProgress });
    }

    if (!teacherId && !studentId) {
      return NextResponse.json({ error: 'Missing teacherId or studentId' }, { status: 400 });
    }

    let studentWhere: any = {};
    if (teacherId && teacherId !== 'ALL') {
      studentWhere.teacherId = teacherId;
    }

    const allStudents = await prisma.student.findMany({
      where: studentWhere,
      include: {
        progress: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const leaderboard = allStudents
      .map((s) => {
        // Sum all points, including OVERALL (which now stores initial points from teacher) and earned points.
        const score = s.progress.reduce((acc, curr) => acc + (curr.category.length === 1 ? 0 : curr.score), 0);
        const emoji = s.emoji;
        return {
          id: s.id,
          name: s.name,
          grade: s.grade,
          points: score,
          emoji: emoji,
        };
      })
      .sort((a, b) => b.points - a.points);

    let progressWhere: any = {
      category: { not: 'OVERALL' }
    };
    if (teacherId && teacherId !== 'ALL') {
      progressWhere.student = { teacherId };
    }

    const progressRecords = await prisma.progress.findMany({
      where: progressWhere,
    });

    return NextResponse.json({
      success: true,
      leaderboard,
      progressRecords,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, category, score, completed } = body;

    if (!studentId || !category) {
      return NextResponse.json({ error: 'Missing studentId or category' }, { status: 400 });
    }

    const addedScore = typeof score === 'number' ? score : 1;
    const isCompleted = typeof completed === 'boolean' ? completed : true;

    // Use Prisma interactive transaction to prevent race conditions on specific categories
    const progress = await prisma.$transaction(async (tx) => {
      let existingProgress = await tx.progress.findFirst({
        where: { studentId, category },
      });

      let updatedProgress;
      if (existingProgress) {
        updatedProgress = await tx.progress.update({
          where: { id: existingProgress.id },
          data: {
            score: { increment: addedScore },
            completed: isCompleted,
          },
        });
      } else {
        updatedProgress = await tx.progress.create({
          data: {
            studentId,
            category,
            score: addedScore,
            completed: isCompleted,
          },
        });
      }

      return updatedProgress;
    });

    return NextResponse.json({ success: true, progress });
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
