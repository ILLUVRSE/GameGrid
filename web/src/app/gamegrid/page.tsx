import Link from "next/link";

export default function GameGridPage() {
  const featuredTiles = [
    {
      label: "Featured",
      title: "PixelPuck Arena",
      description: "World Air Hockey Tournament, 3v3 Arcade Hockey, and Franchise mode.",
      cta: "Play now",
    },
    {
      label: "Coming soon",
      title: "Coming Soon",
      description: "More GameGrid drops are on the way.",
      cta: "Coming Soon",
    },
    {
      label: "Coming soon",
      title: "Coming Soon",
      description: "Stay tuned for the next arcade release.",
      cta: "Coming Soon",
    },
  ];

  const collections = [
    {
      title: "Coming Soon",
      items: ["Coming Soon", "Coming Soon", "Coming Soon", "Coming Soon"],
    },
    {
      title: "Coming Soon",
      items: ["Coming Soon", "Coming Soon", "Coming Soon", "Coming Soon"],
    },
    {
      title: "Coming Soon",
      items: ["Coming Soon", "Coming Soon", "Coming Soon", "Coming Soon"],
    },
  ];

  return (
    <main className="illuvrse-grid min-h-screen bg-illuvrse-night px-6 pb-24 pt-12 text-illuvrse-snow">
      <section className="mx-auto w-full max-w-6xl">
        <div className="relative overflow-hidden rounded-[32px] border border-illuvrse-stroke bg-gradient-to-br from-[#0b172c] via-[#1a2a4a] to-[#0d1324] p-10 md:p-14">
          <div className="absolute -left-20 top-10 h-48 w-48 rounded-full bg-illuvrse-electric/25 blur-3xl" />
          <div className="absolute bottom-6 right-10 h-44 w-44 rounded-full bg-illuvrse-glow/20 blur-3xl" />
          <div className="absolute right-[-20%] top-1/2 h-72 w-72 -translate-y-1/2 rounded-full border border-illuvrse-stroke/60 bg-illuvrse-night/60" />
          <div className="relative z-10 grid gap-10 md:grid-cols-[1.15fr_0.85fr]">
            <div className="max-w-xl">
              <p className="text-xs uppercase tracking-[0.45em] text-illuvrse-muted">
                ILLUVRSE GAMEGRID
              </p>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-tight md:text-5xl">
                The arcade homepage, supercharged.
              </h1>
              <p className="mt-4 text-base text-illuvrse-muted md:text-lg">
                Quick matches, instant restarts, and tournament-ready loops. GameGrid is
                built to feel like a classic arcade portal with modern pulse.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/pixelpuck/"
                  className="rounded-full bg-illuvrse-electric px-6 py-3 text-sm font-semibold text-illuvrse-night transition hover:bg-illuvrse-glow"
                >
                  Play PixelPuck
                </Link>
                <Link
                  href="/"
                  className="rounded-full border border-illuvrse-stroke px-6 py-3 text-sm font-semibold text-illuvrse-snow transition hover:border-illuvrse-electric hover:text-illuvrse-electric"
                >
                  Back to ILLUVRSE
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                  Live now
                </p>
                <h2 className="mt-3 font-display text-2xl font-semibold">PixelPuck</h2>
                <p className="mt-2 text-sm text-illuvrse-muted">
                  World Air Hockey Tournament and 3v3 Arcade Hockey with Franchise mode.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                  <span className="rounded-full border border-illuvrse-stroke px-3 py-1">
                    50 countries
                  </span>
                  <span className="rounded-full border border-illuvrse-stroke px-3 py-1">
                    3v3 squads
                  </span>
                  <span className="rounded-full border border-illuvrse-stroke px-3 py-1">
                    Franchise
                  </span>
                </div>
              </div>
              <div className="rounded-3xl border border-illuvrse-stroke bg-gradient-to-br from-[#111a2c] to-[#16243d] p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                  Arcade track
                </p>
                <div className="mt-3 grid gap-3 text-sm text-illuvrse-muted">
                  <div className="flex items-center justify-between">
                    <span>Peak matches today</span>
                    <span className="text-illuvrse-snow">Coming Soon</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Top mode</span>
                    <span className="text-illuvrse-snow">Coming Soon</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Fastest match</span>
                    <span className="text-illuvrse-snow">Coming Soon</span>
                  </div>
                </div>
                <Link
                  href="/pixelpuck/"
                  className="mt-6 inline-flex rounded-full bg-illuvrse-glow px-5 py-2 text-sm font-semibold text-illuvrse-night"
                >
                  Launch PixelPuck
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 grid w-full max-w-6xl gap-6 md:grid-cols-3">
        {featuredTiles.map((tile, index) => (
          <div
            key={`${tile.title}-${index}`}
            className="rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-7"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
              {tile.label}
            </p>
            <h3 className="mt-3 font-display text-xl font-semibold">{tile.title}</h3>
            <p className="mt-2 text-sm text-illuvrse-muted">{tile.description}</p>
            <Link
              href="/pixelpuck/"
              className="mt-6 inline-flex rounded-full border border-illuvrse-stroke px-5 py-2 text-sm font-semibold text-illuvrse-snow transition hover:border-illuvrse-glow hover:text-illuvrse-glow"
            >
              {tile.cta}
            </Link>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-10 grid w-full max-w-6xl gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-illuvrse-stroke bg-gradient-to-br from-[#0f1728] to-[#18263d] p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                Spotlight grid
              </p>
              <h2 className="mt-3 font-display text-2xl font-semibold">
                The PixelPuck collection
              </h2>
            </div>
            <Link
              href="/pixelpuck/"
              className="rounded-full border border-illuvrse-stroke px-4 py-2 text-xs uppercase tracking-[0.3em] text-illuvrse-muted transition hover:border-illuvrse-electric hover:text-illuvrse-electric"
            >
              See all modes
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {collections.map((collection, index) => (
              <div
                key={`${collection.title}-${index}`}
                className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-night/60 p-5"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                  {collection.title}
                </p>
                <ul className="mt-3 space-y-2 text-sm text-illuvrse-muted">
                  {collection.items.map((item, itemIndex) => (
                    <li
                      key={`${collection.title}-${itemIndex}`}
                      className="flex items-center justify-between"
                    >
                      <span>{item}</span>
                      <span className="text-illuvrse-snow">Coming Soon</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
              Leaderboards
            </p>
            <h3 className="mt-3 text-lg font-semibold">Coming Soon</h3>
            <div className="mt-4 rounded-2xl border border-illuvrse-stroke bg-illuvrse-night/60 px-4 py-3 text-sm text-illuvrse-muted">
              Coming Soon
            </div>
          </div>
          <div className="rounded-3xl border border-illuvrse-stroke bg-gradient-to-br from-[#161e30] to-[#0e1524] p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
              Community hub
            </p>
            <h3 className="mt-3 text-lg font-semibold">Coming Soon</h3>
            <div className="mt-4 rounded-2xl border border-illuvrse-stroke bg-illuvrse-night/60 px-4 py-3 text-sm text-illuvrse-muted">
              Coming Soon
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
              Weekly spotlight
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold">Coming Soon</h2>
            <p className="mt-2 text-sm text-illuvrse-muted">Coming Soon</p>
          </div>
          <div className="rounded-full border border-illuvrse-stroke px-6 py-3 text-sm font-semibold text-illuvrse-muted">
            Coming Soon
          </div>
        </div>
      </section>
    </main>
  );
}
