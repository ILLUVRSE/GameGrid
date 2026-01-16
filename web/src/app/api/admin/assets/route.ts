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

  const episodeId = req.nextUrl.searchParams.get("episodeId") || undefined;
  const assets = await prisma.videoAsset.findMany({
    where: episodeId ? { episode: { is: { id: episodeId } } } : undefined,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let data: {
    sourceUrl?: string;
    hlsManifestUrl?: string;
    durationSec?: number;
    format?: string;
    size?: number;
    subtitlesUrl?: string;
    episodeId?: string;
  };
  try {
    data = (await req.json()) as typeof data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!data.sourceUrl) {
    return NextResponse.json({ error: "sourceUrl is required." }, { status: 400 });
  }

  const asset = await prisma.videoAsset.create({
    data: {
      sourceUrl: data.sourceUrl,
      hlsManifestUrl: typeof data.hlsManifestUrl === "string" ? data.hlsManifestUrl : null,
      durationSec: typeof data.durationSec === "number" ? data.durationSec : null,
      format: typeof data.format === "string" ? data.format : null,
      size: typeof data.size === "number" ? data.size : null,
      subtitlesUrl: typeof data.subtitlesUrl === "string" ? data.subtitlesUrl : null,
      episode: data.episodeId ? { connect: { id: data.episodeId } } : undefined,
    },
  });

  return NextResponse.json(asset, { status: 201 });
}
