import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Number(req.nextUrl.searchParams.get("limit") || 8);

  const lastWatch = await prisma.watchProgress.findFirst({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
  });

  if (!lastWatch) {
    const fallback = await prisma.episode.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { season: { include: { show: true } } },
    });
    return NextResponse.json({
      reason: "Fresh arrivals",
      results: fallback.map((episode) => ({
        id: episode.id,
        title: episode.title,
        synopsis: episode.synopsis,
        seasonNumber: episode.season.number,
        showSlug: episode.season.show.slug,
        showTitle: episode.season.show.title,
      })),
    });
  }

  let results: Array<{
    id: string;
    title: string;
    synopsis: string | null;
    seasonNumber: number;
    showSlug: string;
    showTitle: string;
  }> = [];

  try {
    const hasEmbedding = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS(
        SELECT 1 FROM "Episode"
        WHERE id = $1 AND "embeddingVector" IS NOT NULL
      ) AS "exists"`,
      lastWatch.episodeId,
    );

    if (!hasEmbedding?.[0]?.exists) {
      return NextResponse.json({ reason: "Keep watching", results: [] });
    }

    results = await prisma.$queryRawUnsafe(
      `
      SELECT
        e.id,
        e.title,
        e.synopsis,
        s.number AS "seasonNumber",
        sh.slug AS "showSlug",
        sh.title AS "showTitle"
      FROM "Episode" e
      JOIN "Season" s ON s.id = e."seasonId"
      JOIN "Show" sh ON sh.id = s."showId"
      WHERE e.id <> $1 AND e."embeddingVector" IS NOT NULL
      ORDER BY e."embeddingVector" <-> (
        SELECT "embeddingVector" FROM "Episode" WHERE id = $1
      )
      LIMIT $2
      `,
      lastWatch.episodeId,
      limit,
    );
  } catch {
    results = [];
  }

  if (results.length === 0) {
    return NextResponse.json({ reason: "Keep watching", results: [] });
  }

  return NextResponse.json({
    reason: "Because you watched",
    results,
  });
}
