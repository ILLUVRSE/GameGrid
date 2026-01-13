import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const episode = await prisma.episode.findUnique({
    where: { id },
    include: {
      videoAsset: true,
      season: { include: { show: true } },
    },
  });

  if (!episode) {
    return NextResponse.json({ error: "Episode not found." }, { status: 404 });
  }

  return NextResponse.json(episode);
}
