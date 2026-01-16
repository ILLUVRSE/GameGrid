import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const showId = searchParams.get('showId');

  const seasons = await prisma.season.findMany({
    where: showId ? { showId } : undefined,
    orderBy: { number: 'asc' },
  });

  return NextResponse.json(seasons);
}
