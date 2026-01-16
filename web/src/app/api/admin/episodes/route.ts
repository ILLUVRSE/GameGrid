import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


function isAdmin(req: NextRequest) {
  const session = getSessionFromRequest(req);
  return session?.role === Role.ADMIN || session?.role === Role.EDITOR;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seasonId = req.nextUrl.searchParams.get("seasonId") || undefined;
  const episodes = await prisma.episode.findMany({
    where: seasonId ? { seasonId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { season: { include: { show: true } }, videoAsset: true },
  });
  return NextResponse.json(episodes);
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let data: {
    seasonId?: string;
    number?: number;
    title?: string;
    synopsis?: string;
    runtimeSec?: number;
  };
  try {
    data = (await req.json()) as typeof data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!data.seasonId || !Number.isInteger(data.number) || typeof data.title !== "string") {
    return NextResponse.json(
      { error: "seasonId, number, and title are required." },
      { status: 400 },
    );
  }

  const number = data.number as number;
  try {
    const episode = await prisma.episode.create({
      data: {
        seasonId: data.seasonId,
        number,
        title: data.title,
        synopsis: typeof data.synopsis === "string" ? data.synopsis : null,
        runtimeSec: typeof data.runtimeSec === "number" ? data.runtimeSec : null,
      },
    });
    return NextResponse.json(episode, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create episode." }, { status: 500 });
  }
}
