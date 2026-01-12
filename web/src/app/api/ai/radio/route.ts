import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createStation } from "@/lib/ai/radio";

type StationRequest = {
  theme?: string;
  limit?: number;
};

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }

  const station = await prisma.station.findUnique({
    where: { slug },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          episode: {
            include: { season: { include: { show: true } } },
          },
        },
      },
    },
  });

  if (!station) {
    return NextResponse.json({ error: "Station not found." }, { status: 404 });
  }

  return NextResponse.json(station);
}

export async function POST(req: NextRequest) {
  let body: StationRequest;
  try {
    body = (await req.json()) as StationRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const theme = body.theme?.trim() || "ILLUVRSE adventure mix";
  const limit = Math.min(Math.max(Number(body.limit || 12), 6), 24);

  const station = await createStation({ theme, limit });

  return NextResponse.json(station);
}
