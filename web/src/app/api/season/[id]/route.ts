import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const season = await prisma.season.findUnique({
    where: { id },
    include: {
      show: true,
      episodes: { orderBy: { number: "asc" }, include: { videoAsset: true } },
    },
  });

  if (!season) {
    return NextResponse.json({ error: "Season not found." }, { status: 404 });
  }

  return NextResponse.json(season);
}
