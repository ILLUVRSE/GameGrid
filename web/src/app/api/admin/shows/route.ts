import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { createShow, listShows } from '@/lib/db/show';
import { Prisma } from '@prisma/client';
import { Role } from '@prisma/client';

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

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const shows = await listShows();
  return NextResponse.json(shows);
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.json();
  if (!data.title || typeof data.title !== 'string') {
    return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  }

  const slug = data.slug ? slugify(data.slug) : slugify(data.title);
  if (!slug) {
    return NextResponse.json({ error: 'Invalid slug.' }, { status: 400 });
  }
  try {
    const show = await createShow({
      title: data.title,
      synopsis: data.synopsis,
      slug,
      heroImageUrl: data.heroImageUrl,
      posterUrl: data.posterUrl,
    });
    return NextResponse.json(show, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Slug already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create show.' }, { status: 500 });
  }
}
