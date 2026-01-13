import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { semanticSearch } from '@/lib/ai/embeddings';

type SearchResultType = 'show' | 'episode';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q')?.trim() || '';
  const type = searchParams.get('type') as SearchResultType | undefined;
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  if (!q) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required.' },
      { status: 400 },
    );
  }

  try {
    const semanticResults = await semanticSearch(q, limit * 2 + offset);
    const filtered = semanticResults.filter((result) =>
      type ? result.type === type : true,
    );

    if (filtered.length > 0) {
      const slice = filtered.slice(offset, offset + limit);
      return NextResponse.json({
        results: slice.map((result) => {
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
        nextOffset: offset + slice.length < filtered.length ? offset + slice.length : null,
      });
    }
  } catch {
    // Fall back to keyword search when embeddings are unavailable.
  }

  const take = limit + offset;
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
          take,
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
          take,
        }),
  ]);

  const combined = [
    ...shows.map((show) => ({ type: 'show' as const, ...show })),
    ...episodes.map((episode) => ({
      type: 'episode' as const,
      ...episode,
      seasonNumber: episode.season.number,
    })),
  ]
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(offset, offset + limit);

  const totalFetched = shows.length + episodes.length;
  const hasMore = offset + limit < totalFetched;

  return NextResponse.json({ results: combined, nextOffset: hasMore ? offset + limit : null });
}
