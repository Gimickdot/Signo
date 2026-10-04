import { NextResponse } from 'next/server';
import { prisma } from 'lib/prisma';

// PATCH /api/profile — update teacher name, icon, and/or background color
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, profileIcon, profileBgColor } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Kailangan ang user ID.' }, { status: 400 });
    }

    const updates: Record<string, string> = {};

    if (name && name.trim().length > 0) {
      updates.name = name.trim();
    }
    if (profileIcon !== undefined) {
      updates.profileIcon = profileIcon;
    }
    if (profileBgColor !== undefined) {
      updates.profileBgColor = profileBgColor;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Walang pagbabago.' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    // Log audit
    try {
      await prisma.auditLog.create({
        data: {
          userId: updated.id,
          type: 'audit',
          message: `${updated.name} (${updated.email}) -- Na-update ang profile.`,
        },
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        school: updated.school,
        role: updated.role,
        emoji: updated.emoji,
        profileIcon: updated.profileIcon,
        profileBgColor: updated.profileBgColor,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Hindi ma-update ang profile.' }, { status: 500 });
  }
}
