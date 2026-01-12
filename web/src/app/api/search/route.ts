import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { semanticSearch } from '@/lib/ai/embeddings';

type SearchResultType = 'show' | 'episode';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q')?.trim() || '';
  const type = searchParams.get('type') as SearchResultType | undefined;
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  if (!q) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required.' },
      { status: 400 },
    );
  }

  try {
    const semanticResults = await semanticSearch(q, limit * 2);
    const filtered = semanticResults.filter((result) =>
      type ? result.type === type : true,
    );

    if (filtered.length > 0) {
      return NextResponse.json({
        results: filtered.slice(0, limit).map((result) => {
          if (result.type === 'show') {
            return {
              type: 'show' as const,
              id: result.id,
              title: result.title,
              synopsis: result.synopsis,
              slug: result.slug,
            };
          }

          return {
            type: 'episode' as const,
            id: result.id,
            title: result.title,
            synopsis: result.synopsis,
            seasonNumber: result.seasonNumber ?? 0,
          };
        }),
      });
    }
  } catch {
    // Fall back to keyword search when embeddings are unavailable.
  }

  const [shows, episodes] = await Promise.all([
    type && type !== 'show'
      ? Promise.resolve([])
      : prisma.show.findMany({
          where: {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { synopsis: { contains: q, mode: 'insensitive' } },
            ],
          },
          take: limit,
        }),
    type && type !== 'episode'
      ? Promise.resolve([])
      : prisma.episode.findMany({
          where: {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { synopsis: { contains: q, mode: 'insensitive' } },
            ],
          },
          include: { season: true },
          take: limit,
        }),
  ]);

  const results = [
    ...shows.map((show) => ({ type: 'show' as const, ...show })),
    ...episodes.map((episode) => ({
      type: 'episode' as const,
      ...episode,
      seasonNumber: episode.season.number,
    })),
  ]
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, limit);

  return NextResponse.json({ results });
}
