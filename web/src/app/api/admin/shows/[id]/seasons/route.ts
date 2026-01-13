import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

function isAdmin(req: NextRequest) {
  const session = getSessionFromRequest(req);
  return session?.role === Role.ADMIN || session?.role === Role.EDITOR;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.json();
  const number = Number(data.number);
  if (!Number.isInteger(number)) {
    return NextResponse.json({ error: 'Season number is required.' }, { status: 400 });
  }

  try {
    const show = await prisma.show.findUnique({ where: { id } });
    if (!show) {
      return NextResponse.json({ error: 'Show not found.' }, { status: 404 });
    }
    const season = await prisma.season.create({
      data: {
        showId: id,
        number,
        title: typeof data.title === 'string' ? data.title : null,
        synopsis: typeof data.synopsis === 'string' ? data.synopsis : null,
      },
    });
    return NextResponse.json(season, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create season.' }, { status: 500 });
  }
}
