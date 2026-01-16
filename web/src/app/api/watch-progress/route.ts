import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  const episodeId = req.nextUrl.searchParams.get('episodeId');

  if (!session || !episodeId) {
    return NextResponse.json({ error: 'Missing user or episode id' }, { status: 400 });
  }

  const progress = await prisma.watchProgress.findUnique({
    where: { userId_episodeId: { userId: session.userId, episodeId } },
  });

  if (!progress) {
    return NextResponse.json({ position: 0 });
  }

  return NextResponse.json({
    position: progress.position,
    updatedAt: progress.updatedAt,
  });
}

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { episodeId, position } = body;
  if (!episodeId || typeof position !== 'number' || position < 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  await prisma.watchProgress.upsert({
    where: { userId_episodeId: { userId: session.userId, episodeId } },
    update: { position },
    create: {
      userId: session.userId,
      episodeId,
      position,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = getSessionFromRequest(req);
  const episodeId = req.nextUrl.searchParams.get('episodeId');
  if (!session || !episodeId) {
    return NextResponse.json({ error: 'Missing user or episode id' }, { status: 400 });
  }
  await prisma.watchProgress.deleteMany({
    where: { userId: session.userId, episodeId },
  });
  return NextResponse.json({ success: true });
}
