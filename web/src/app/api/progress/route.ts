import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Number(req.nextUrl.searchParams.get("limit") || 12);
  const progress = await prisma.watchProgress.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
    take: Math.min(Math.max(limit, 1), 50),
    include: {
      episode: { include: { season: { include: { show: true } }, videoAsset: true } },
    },
  });

  return NextResponse.json({
    results: progress.map((item) => ({
      id: item.id,
      position: item.position,
      updatedAt: item.updatedAt,
      episode: {
        id: item.episode.id,
        title: item.episode.title,
        synopsis: item.episode.synopsis,
        seasonNumber: item.episode.season.number,
        showTitle: item.episode.season.show.title,
        showSlug: item.episode.season.show.slug,
      },
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { episodeId?: string; position?: number };
  try {
    body = (await req.json()) as { episodeId?: string; position?: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { episodeId, position } = body;
  if (!episodeId || typeof position !== "number" || position < 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
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
