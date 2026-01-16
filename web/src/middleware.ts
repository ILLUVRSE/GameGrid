import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (!process.env.DATABASE_URL && request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 },
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
