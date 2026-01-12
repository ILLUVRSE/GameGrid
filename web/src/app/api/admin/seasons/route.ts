import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Prisma, Role } from "@prisma/client";

function isAdmin(req: NextRequest) {
  const session = getSessionFromRequest(req);
  return session?.role === Role.ADMIN || session?.role === Role.EDITOR;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const showId = req.nextUrl.searchParams.get("showId") || undefined;
  const seasons = await prisma.season.findMany({
    where: showId ? { showId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { show: true },
  });
  return NextResponse.json(seasons);
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let data: { showId?: string; number?: number; title?: string; synopsis?: string };
  try {
    data = (await req.json()) as typeof data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!data.showId || !Number.isInteger(data.number)) {
    return NextResponse.json(
      { error: "showId and number are required." },
      { status: 400 },
    );
  }

  try {
    const season = await prisma.season.create({
      data: {
        showId: data.showId,
        number: data.number,
        title: typeof data.title === "string" ? data.title : null,
        synopsis: typeof data.synopsis === "string" ? data.synopsis : null,
      },
    });
    return NextResponse.json(season, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Season already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create season." }, { status: 500 });
  }
}
