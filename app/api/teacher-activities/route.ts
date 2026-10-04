import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');

  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId is required' }, { status: 400 });
  }

  try {
    const activities = await prisma.teacherActivity.findMany({
      where: { teacherId },
      orderBy: { timestamp: 'desc' },
      take: 30, // Limit to recent 30 activities
    });
    return NextResponse.json({ activities }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teacher activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teacherId, studentName, emoji, type, mode, timestamp } = body;

    if (!teacherId || !studentName || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newActivity = await prisma.teacherActivity.create({
      data: {
        teacherId,
        studentName,
        emoji: emoji || '👤',
        type,
        mode,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    return NextResponse.json({ activity: newActivity }, { status: 201 });
  } catch (error) {
    console.error('Error creating teacher activity:', error);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}
