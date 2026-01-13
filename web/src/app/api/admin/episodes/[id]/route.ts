import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

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

  const episode = await prisma.episode.findUnique({
    where: { id },
    include: { season: { include: { show: true } }, videoAsset: true },
  });

  if (!episode) {
    return NextResponse.json({ error: "Episode not found." }, { status: 404 });
  }

  return NextResponse.json(episode);
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
    number?: number;
    title?: string | null;
    synopsis?: string | null;
    runtimeSec?: number | null;
    seasonId?: string;
    videoAssetId?: string | null;
  };
  try {
    data = (await req.json()) as typeof data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (Number.isInteger(data.number)) updates.number = data.number;
  if (typeof data.title === "string" || data.title === null) updates.title = data.title;
  if (typeof data.synopsis === "string" || data.synopsis === null) {
    updates.synopsis = data.synopsis;
  }
  if (typeof data.runtimeSec === "number" || data.runtimeSec === null) {
    updates.runtimeSec = data.runtimeSec;
  }
  if (typeof data.seasonId === "string") updates.seasonId = data.seasonId;
  if (typeof data.videoAssetId === "string" || data.videoAssetId === null) {
    updates.videoAssetId = data.videoAssetId;
  }

  try {
    const episode = await prisma.episode.update({
      where: { id },
      data: updates,
    });
    return NextResponse.json(episode);
  } catch {
    return NextResponse.json({ error: "Episode not found." }, { status: 404 });
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
    await prisma.episode.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Episode not found." }, { status: 404 });
  }
}
