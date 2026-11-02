import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Hindi pinahihintulutan ang sariling pagrehistro. Ang Admin lamang ang may kakayahang magdagdag ng mga guro. (Direct registration is disabled. Only the Administrator can create teacher accounts).',
    },
    { status: 403 }
  );
}
