import { NextRequest, NextResponse } from "next/server";
import { createStation } from "@/lib/ai/radio";

type StationRequest = {
  theme?: string;
  limit?: number;
};

export const runtime = "nodejs";

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
