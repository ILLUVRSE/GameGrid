import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const season = await prisma.season.findUnique({
    where: { id: params.id },
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
