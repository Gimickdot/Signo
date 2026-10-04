import { NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const logType = searchParams.get('type'); // 'app', 'audit', 'error'

    let whereClause: any = {};
    if (logType) {
      whereClause.type = logType;
    }

    let logs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, email: true, role: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    // Auto-seed initial sample log data if DB auditLog table is empty
    if (logs.length === 0) {
      const sampleLogs = [
        { type: 'audit', message: 'System Administrator -- Matagumpay na nag-login sa Admin Portal' },
        { type: 'audit', message: 'Gng. Reyes -- Matagumpay na nag-login mula sa PSD Pasay' },
        { type: 'app', message: 'MediaPipe initialized successfully in 1.4s' },
        { type: 'app', message: 'TensorFlow model loaded from cache: size 4.2MB' },
        { type: 'error', message: 'Webcam feed timeout - Klase 2B, hindi na-reconnect after 30s' },
      ];

      for (const log of sampleLogs) {
        await prisma.auditLog.create({
          data: {
            type: log.type,
            message: log.message,
          },
        });
      }

      logs = await prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: { select: { name: true, email: true, role: true } },
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });
    }

    const formattedLogs = logs.map((l) => {
      const timeStr = l.timestamp.toISOString().substring(11, 19);
      let level = 'INFO';
      if (l.type === 'audit') level = 'LOGIN';
      if (l.type === 'error') level = 'ERROR';

      return {
        id: l.id,
        time: timeStr,
        level: level,
        desc: l.message,
        timestamp: l.timestamp,
      };
    });

    return NextResponse.json({ success: true, logs: formattedLogs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, type, message } = body;

    if (!message) {
      return NextResponse.json({ error: 'Missing log message' }, { status: 400 });
    }

    const log = await prisma.auditLog.create({
      data: {
        userId: userId || null,
        type: type || 'audit',
        message: message,
      },
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 });
  }
}
