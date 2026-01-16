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

  const showId = req.nextUrl.searchParams.get("showId");
  const episodeId = req.nextUrl.searchParams.get("episodeId");

  if (showId || episodeId) {
    const item = await prisma.watchlistItem.findFirst({
      where: {
        userId: session.userId,
        showId: showId ?? undefined,
        episodeId: episodeId ?? undefined,
      },
    });
    return NextResponse.json({ inList: Boolean(item) });
  }

  const items = await prisma.watchlistItem.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      show: true,
      episode: { include: { season: { include: { show: true } } } },
    },
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      show: item.show
        ? {
            id: item.show.id,
            title: item.show.title,
            synopsis: item.show.synopsis,
            slug: item.show.slug,
          }
        : null,
      episode: item.episode
        ? {
            id: item.episode.id,
            title: item.episode.title,
            synopsis: item.episode.synopsis,
            seasonNumber: item.episode.season.number,
            showTitle: item.episode.season.show.title,
            showSlug: item.episode.season.show.slug,
          }
        : null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { showId, episodeId } = body as { showId?: string; episodeId?: string };
  if ((showId && episodeId) || (!showId && !episodeId)) {
    return NextResponse.json({ error: "Provide either showId or episodeId" }, { status: 400 });
  }

  if (showId) {
    await prisma.watchlistItem.upsert({
      where: { userId_showId: { userId: session.userId, showId } },
      update: {},
      create: { userId: session.userId, showId },
    });
  } else if (episodeId) {
    await prisma.watchlistItem.upsert({
      where: { userId_episodeId: { userId: session.userId, episodeId } },
      update: {},
      create: { userId: session.userId, episodeId },
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const showId = req.nextUrl.searchParams.get("showId");
  const episodeId = req.nextUrl.searchParams.get("episodeId");
  if ((showId && episodeId) || (!showId && !episodeId)) {
    return NextResponse.json({ error: "Provide either showId or episodeId" }, { status: 400 });
  }

  await prisma.watchlistItem.deleteMany({
    where: {
      userId: session.userId,
      showId: showId ?? undefined,
      episodeId: episodeId ?? undefined,
    },
  });

  return NextResponse.json({ success: true });
}
