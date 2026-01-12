import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const seasonId = request.nextUrl.searchParams.get('seasonId');
  const episodes = await prisma.episode.findMany({
    where: seasonId ? { seasonId } : undefined,
    orderBy: { number: 'asc' },
    include: { videoAsset: true },
  });
  return NextResponse.json(episodes, { status: 200 });
}
