import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { transcodeToHls } from "@/lib/media/transcode";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";



function isAdmin(req: NextRequest) {
  const session = getSessionFromRequest(req);
  return session?.role === Role.ADMIN || session?.role === Role.EDITOR;
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { assetId?: string; sourceUrl?: string };
  try {
    body = (await req.json()) as { assetId?: string; sourceUrl?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body.assetId) {
    return NextResponse.json({ error: "assetId is required." }, { status: 400 });
  }

  const asset = await prisma.videoAsset.findUnique({ where: { id: body.assetId } });
  if (!asset) {
    return NextResponse.json({ error: "Video asset not found." }, { status: 404 });
  }

  const input = body.sourceUrl || asset.sourceUrl;
  if (!input) {
    return NextResponse.json({ error: "sourceUrl is required." }, { status: 400 });
  }

  const outputDir = path.join(process.cwd(), "public", "media", asset.id);
  const job = await prisma.transcodeJob.create({
    data: { assetId: asset.id, status: "running" },
  });

  try {
    const result = await transcodeToHls({ input, outputDir });
    const manifestUrl = `/media/${asset.id}/index.m3u8`;
    await prisma.videoAsset.update({
      where: { id: asset.id },
      data: { hlsManifestUrl: manifestUrl },
    });
    await prisma.transcodeJob.update({
      where: { id: job.id },
      data: { status: "completed", outputPath: result.manifestPath },
    });
    return NextResponse.json({ status: "completed", jobId: job.id, manifestUrl });
  } catch (error) {
    await prisma.transcodeJob.update({
      where: { id: job.id },
      data: { status: "failed", error: error instanceof Error ? error.message : "Unknown error" },
    });
    return NextResponse.json({ error: "Transcode failed." }, { status: 500 });
  }
}
