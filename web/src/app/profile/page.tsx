import Link from "next/link";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("illuvrse_auth")?.value;
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

  const watchlist = await prisma.watchlistItem.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      show: true,
      episode: { include: { season: { include: { show: true } } } },
    },
  });
  const profile = await prisma.profile.findUnique({
    where: { userId: session.userId },
  });
  const watchHistory = await prisma.watchProgress.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
    take: 8,
    include: {
      episode: { include: { season: { include: { show: true } } } },
    },
  });

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

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Watch history</h2>
          {watchHistory.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5 text-sm text-illuvrse-muted">
              Start watching an episode to build your history.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {watchHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5"
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                    {entry.episode.season.show.title} · Season {entry.episode.season.number}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">{entry.episode.title}</h3>
                  <p className="mt-2 text-sm text-illuvrse-muted">
                    {entry.episode.synopsis || "No synopsis yet."}
                  </p>
                  <div className="mt-4 flex gap-4 text-sm font-semibold">
                    <Link href={`/watch/${entry.episode.id}`} className="text-illuvrse-glow">
                      Continue
                    </Link>
                    <Link href={`/episode/${entry.episode.id}`} className="text-illuvrse-electric">
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Preferences</h2>
          <div className="mt-4 rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5 text-sm text-illuvrse-muted">
            <p>
              Display name:{" "}
              <span className="text-illuvrse-snow">
                {profile?.displayName || "Not set"}
              </span>
            </p>
            <p className="mt-2">
              Kids mode:{" "}
              <span className="text-illuvrse-snow">
                {profile?.kidsMode ? "Enabled" : "Off"}
              </span>
            </p>
            <p className="mt-2">
              Bio:{" "}
              <span className="text-illuvrse-snow">{profile?.bio || "None"}</span>
            </p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">My List</h2>
          {watchlist.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5 text-sm text-illuvrse-muted">
              Your list is empty. Add a show or episode to keep it handy.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {watchlist.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5"
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                    {item.show ? "Show" : "Episode"}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold text-illuvrse-snow">
                    {item.show?.title || item.episode?.title}
                  </h3>
                  <p className="mt-2 text-sm text-illuvrse-muted">
                    {item.show?.synopsis || item.episode?.synopsis || "No synopsis yet."}
                  </p>
                  <div className="mt-4 flex gap-4 text-sm font-semibold">
                    {item.show && (
                      <Link href={`/show/${item.show.slug}`} className="text-illuvrse-electric">
                        Open show
                      </Link>
                    )}
                    {item.episode && (
                      <>
                        <Link href={`/episode/${item.episode.id}`} className="text-illuvrse-electric">
                          Details
                        </Link>
                        <Link href={`/watch/${item.episode.id}`} className="text-illuvrse-glow">
                          Watch
                        </Link>
                      </>
                    )}
                  </div>
                  {item.episode && (
                    <p className="mt-3 text-xs text-illuvrse-muted">
                      {item.episode.season.show.title} · Season {item.episode.season.number}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
