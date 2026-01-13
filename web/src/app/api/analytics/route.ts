import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, episodeId, position } = body as {
    event?: string;
    episodeId?: string;
    position?: number;
  };

  if (!event || !episodeId) {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }

  console.info("analytics:event", {
    event,
    episodeId,
    position,
    userId: session?.userId ?? null,
    at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
