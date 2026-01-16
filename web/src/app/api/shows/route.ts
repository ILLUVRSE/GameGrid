import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


export async function GET() {
  const shows = await prisma.show.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(shows);
}
