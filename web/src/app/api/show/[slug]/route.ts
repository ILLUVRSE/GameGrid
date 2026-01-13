import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const show = await prisma.show.findUnique({
    where: { slug },
    include: {
      seasons: {
        orderBy: { number: "asc" },
        include: {
          episodes: {
            orderBy: { number: "asc" },
            include: { videoAsset: true },
          },
        },
      },
    },
  });

  if (!show) {
    return NextResponse.json({ error: "Show not found." }, { status: 404 });
  }

  return NextResponse.json(show);
}
