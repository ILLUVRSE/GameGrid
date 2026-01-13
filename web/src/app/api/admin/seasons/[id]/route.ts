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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let data: { number?: number; title?: string | null; synopsis?: string | null };
  try {
    data = (await req.json()) as typeof data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const updates: { number?: number; title?: string | null; synopsis?: string | null } = {};
  if (Number.isInteger(data.number)) updates.number = data.number;
  if (typeof data.title === "string" || data.title === null) updates.title = data.title;
  if (typeof data.synopsis === "string" || data.synopsis === null) {
    updates.synopsis = data.synopsis;
  }

  try {
    const season = await prisma.season.update({
      where: { id },
      data: updates,
    });
    return NextResponse.json(season);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Season already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Season not found." }, { status: 404 });
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
    await prisma.season.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Season not found." }, { status: 404 });
  }
}
