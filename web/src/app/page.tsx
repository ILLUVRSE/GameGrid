import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const shows = await prisma.show.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const featured = shows[0] ?? {
    id: "featured",
    slug: "illuvrse-origins",
    title: "ILLUVRSE: Origins",
    synopsis: "Journey into the first chapter of the ILLUVRSE saga.",
  };

  return (
    <main className="illuvrse-grid min-h-screen bg-illuvrse-night text-illuvrse-snow">
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-12">
        <div className="relative overflow-hidden rounded-3xl border border-illuvrse-stroke bg-gradient-to-br from-illuvrse-dusk via-[#1b2439] to-[#0f1627] p-10 md:p-14">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-illuvrse-ember/25 blur-3xl" />
          <div className="absolute bottom-0 left-10 h-40 w-40 rounded-full bg-illuvrse-electric/25 blur-2xl" />
          <div className="relative z-10 max-w-2xl">
            <p className="text-xs uppercase tracking-[0.45em] text-illuvrse-muted">
              ILLUVRSE PLATFORM
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight md:text-5xl">
              Streaming originals. Always-on GameGrid.
            </h1>
            <p className="mt-4 text-base text-illuvrse-muted md:text-lg">
              One destination for cinematic worlds and fast-play arcade energy. Dive into the
              streaming catalog or jump straight into PixelPuck.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/home"
                className="rounded-full bg-illuvrse-glow px-6 py-3 text-sm font-semibold text-illuvrse-night transition hover:bg-illuvrse-ember"
              >
                Enter streaming
              </Link>
              <Link
                href="/gamegrid"
                className="rounded-full border border-illuvrse-stroke px-6 py-3 text-sm font-semibold text-illuvrse-snow transition hover:border-illuvrse-electric hover:text-illuvrse-electric"
              >
                Launch GameGrid
              </Link>
            </div>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                Streaming + Media
              </p>
              <p className="mt-3 text-lg font-semibold">Featured premiere</p>
              <p className="mt-2 text-sm text-illuvrse-muted">
                {featured.title} · {featured.synopsis || "A cinematic launch into the ILLUVRSE."}
              </p>
              <Link
                href={`/show/${featured.slug}`}
                className="mt-4 inline-flex text-sm font-semibold text-illuvrse-electric"
              >
                Watch now
              </Link>
            </div>
            <div className="rounded-2xl border border-illuvrse-stroke bg-gradient-to-br from-illuvrse-panel to-[#101828] p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">GameGrid</p>
              <p className="mt-3 text-lg font-semibold">PixelPuck</p>
              <p className="mt-2 text-sm text-illuvrse-muted">
                World Air Hockey Tournament and 3v3 Arcade Hockey. First of many.
              </p>
              <Link
                href="/pixelpuck/"
                className="mt-4 inline-flex text-sm font-semibold text-illuvrse-glow"
              >
                Play PixelPuck
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Latest shows</h2>
          <Link href="/search" className="text-sm text-illuvrse-muted hover:text-illuvrse-snow">
            View all
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {shows.length === 0 ? (
            <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-6 text-illuvrse-muted">
              No shows yet. Create one in the admin dashboard.
            </div>
          ) : (
            shows.map((show) => (
              <Link
                key={show.id}
                href={`/show/${show.slug}`}
                className="group rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5 transition hover:-translate-y-1 hover:border-illuvrse-electric/60"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                    ILLUVRSE
                  </span>
                  <span className="text-xs text-illuvrse-muted">Show</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-illuvrse-snow group-hover:text-illuvrse-electric">
                  {show.title}
                </h3>
                <p className="mt-2 text-sm text-illuvrse-muted line-clamp-3">
                  {show.synopsis || "A new world awaits in this original series."}
                </p>
                <span className="mt-4 inline-flex items-center text-xs text-illuvrse-muted">
                  Open show
                </span>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
          <div className="rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-7">
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
              GameGrid launch
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold">Arcade floor is live</h2>
            <p className="mt-2 text-sm text-illuvrse-muted">
              PixelPuck is live now, with more competitive arcade experiences queued next.
              Drop in, challenge AI, or bring a full 3v3 squad online.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/pixelpuck/"
                className="rounded-full bg-illuvrse-electric px-5 py-2 text-sm font-semibold text-illuvrse-night"
              >
                Play PixelPuck
              </Link>
              <Link
                href="/gamegrid"
                className="rounded-full border border-illuvrse-stroke px-5 py-2 text-sm font-semibold text-illuvrse-snow"
              >
                Visit GameGrid
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-illuvrse-stroke bg-gradient-to-br from-[#0f1729] to-[#17233b] p-7">
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
              Streaming pulse
            </p>
            <h3 className="mt-3 text-lg font-semibold">Next premieres</h3>
            <ul className="mt-4 space-y-3 text-sm text-illuvrse-muted">
              <li>ILLUVRSE: Origins — Season 1 finale</li>
              <li>Signal Drift — Episode drop in 48 hours</li>
              <li>Neon Corridor — New arc reveal</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
