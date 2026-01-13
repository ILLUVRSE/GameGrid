import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { deleteShow, updateShow } from '@/lib/db/show';
import { prisma } from '@/lib/prisma';
import { Prisma, Role } from '@prisma/client';

function isAdmin(req: NextRequest) {
  const session = getSessionFromRequest(req);
  return session?.role === Role.ADMIN || session?.role === Role.EDITOR;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const show = await prisma.show.findUnique({
    where: { id: params.id },
    include: {
      seasons: { orderBy: { number: 'asc' } },
    },
  });

  if (!show) {
    return NextResponse.json({ error: 'Show not found.' }, { status: 404 });
  }

  return NextResponse.json(show);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.json();
  const updates: {
    title?: string;
    synopsis?: string | null;
    slug?: string;
    heroImageUrl?: string | null;
    posterUrl?: string | null;
  } = {};
  if (typeof data.title === 'string') updates.title = data.title;
  if (typeof data.synopsis === 'string' || data.synopsis === null) {
    updates.synopsis = data.synopsis;
  }
  if (typeof data.slug === 'string') {
    const slug = slugify(data.slug);
    if (!slug) {
      return NextResponse.json({ error: 'Invalid slug.' }, { status: 400 });
    }
    updates.slug = slug;
  }
  if (typeof data.heroImageUrl === 'string' || data.heroImageUrl === null) {
    updates.heroImageUrl = data.heroImageUrl;
  }
  if (typeof data.posterUrl === 'string' || data.posterUrl === null) {
    updates.posterUrl = data.posterUrl;
  }

  try {
    const show = await updateShow(params.id, updates);
    return NextResponse.json(show);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Slug already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Show not found.' }, { status: 404 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await deleteShow(params.id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Show not found.' }, { status: 404 });
  }
}
