import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


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
  if (!Number.isInteger(number) || typeof data.title !== 'string') {
    return NextResponse.json({ error: 'Episode number and title are required.' }, { status: 400 });
  }

  try {
    const season = await prisma.season.findUnique({ where: { id } });
    if (!season) {
      return NextResponse.json({ error: 'Season not found.' }, { status: 404 });
    }
    const episode = await prisma.episode.create({
      data: {
        seasonId: id,
        number,
        title: data.title,
        synopsis: typeof data.synopsis === 'string' ? data.synopsis : null,
        runtimeSec: typeof data.runtimeSec === 'number' ? data.runtimeSec : null,
      },
    });

    if (typeof data.sourceUrl === 'string') {
      const asset = await prisma.videoAsset.create({
        data: {
          sourceUrl: data.sourceUrl,
          durationSec: typeof data.durationSec === 'number' ? data.durationSec : null,
          hlsManifestUrl: typeof data.hlsManifestUrl === 'string' ? data.hlsManifestUrl : null,
          format: typeof data.format === 'string' ? data.format : null,
          size: typeof data.size === 'number' ? data.size : null,
          subtitlesUrl: typeof data.subtitlesUrl === 'string' ? data.subtitlesUrl : null,
        },
      });

      await prisma.episode.update({
        where: { id: episode.id },
        data: { videoAssetId: asset.id },
      });
    }

    return NextResponse.json(episode, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create episode.' }, { status: 500 });
  }
}
