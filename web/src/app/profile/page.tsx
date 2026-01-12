import Link from "next/link";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/jwt";

export default function ProfilePage() {
  const token = cookies().get("illuvrse_auth")?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    return (
      <main className="min-h-screen bg-illuvrse-night px-6 py-20 text-illuvrse-snow">
        <div className="mx-auto w-full max-w-xl text-center">
          <h1 className="text-2xl font-semibold">Sign in to view your profile</h1>
          <p className="mt-3 text-sm text-illuvrse-muted">
            Your profile settings and watch history live here.
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

  return (
    <main className="min-h-screen bg-illuvrse-night px-6 py-20 text-illuvrse-snow">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-3xl font-semibold">Profile</h1>
        <div className="mt-6 rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-6">
          <p className="text-sm text-illuvrse-muted">Signed in as</p>
          <p className="mt-2 text-lg font-semibold">{session.email}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
            Role: {session.role}
          </p>
        </div>
        <div className="mt-6 flex gap-3">
          <Link
            href="/home"
            className="rounded-full border border-illuvrse-stroke px-5 py-2 text-sm font-semibold"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
