import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Prisma, Role } from "@prisma/client";

function isAdmin(req: NextRequest) {
  const session = getSessionFromRequest(req);
  return session?.role === Role.ADMIN || session?.role === Role.EDITOR;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const asset = await prisma.videoAsset.findUnique({
    where: { id },
    include: { episode: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  return NextResponse.json(asset);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let data: {
    sourceUrl?: string | null;
    hlsManifestUrl?: string | null;
    durationSec?: number | null;
    format?: string | null;
    size?: number | null;
    subtitlesUrl?: string | null;
    episodeId?: string | null;
  };
  try {
    data = (await req.json()) as typeof data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const updates: Prisma.VideoAssetUpdateInput = {};
  if (typeof data.sourceUrl === "string") {
    updates.sourceUrl = data.sourceUrl;
  }
  if (typeof data.hlsManifestUrl === "string" || data.hlsManifestUrl === null) {
    updates.hlsManifestUrl = data.hlsManifestUrl;
  }
  if (typeof data.durationSec === "number" || data.durationSec === null) {
    updates.durationSec = data.durationSec;
  }
  if (typeof data.format === "string" || data.format === null) {
    updates.format = data.format;
  }
  if (typeof data.size === "number" || data.size === null) {
    updates.size = data.size;
  }
  if (typeof data.subtitlesUrl === "string" || data.subtitlesUrl === null) {
    updates.subtitlesUrl = data.subtitlesUrl;
  }
  if (typeof data.episodeId === "string") {
    updates.episode = { connect: { id: data.episodeId } };
  } else if (data.episodeId === null) {
    updates.episode = { disconnect: true };
  }

  try {
    const asset = await prisma.videoAsset.update({
      where: { id },
      data: updates,
    });
    return NextResponse.json(asset);
  } catch {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.videoAsset.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }
}
