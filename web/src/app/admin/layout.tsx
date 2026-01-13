import Link from "next/link";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/jwt";
import type { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("illuvrse_auth")?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    return (
      <main className="min-h-screen bg-illuvrse-night px-6 py-20 text-illuvrse-snow">
        <div className="mx-auto w-full max-w-xl text-center">
          <h1 className="text-2xl font-semibold">Admin access required</h1>
          <p className="mt-3 text-sm text-illuvrse-muted">
            Sign in with an admin or editor account to manage the catalog.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-full bg-illuvrse-glow px-6 py-3 text-sm font-semibold text-illuvrse-night"
          >
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  if (session.role !== "ADMIN" && session.role !== "EDITOR") {
    return (
      <main className="min-h-screen bg-illuvrse-night px-6 py-20 text-illuvrse-snow">
        <div className="mx-auto w-full max-w-xl text-center">
          <h1 className="text-2xl font-semibold">Not authorized</h1>
          <p className="mt-3 text-sm text-illuvrse-muted">
            Your account does not have access to admin tools.
          </p>
          <Link
            href="/home"
            className="mt-6 inline-flex rounded-full border border-illuvrse-stroke px-6 py-3 text-sm font-semibold text-illuvrse-snow"
          >
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
