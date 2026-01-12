import Link from "next/link";

export default function GameGridPage() {
  return (
    <main className="min-h-screen bg-illuvrse-night px-6 pb-20 pt-12 text-illuvrse-snow">
      <section className="mx-auto w-full max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl border border-illuvrse-stroke bg-gradient-to-br from-[#0d182a] via-[#14233a] to-[#0a1222] p-10 md:p-14">
          <div className="absolute -left-20 top-10 h-48 w-48 rounded-full bg-illuvrse-electric/25 blur-3xl" />
          <div className="absolute bottom-6 right-10 h-44 w-44 rounded-full bg-illuvrse-glow/20 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <p className="text-xs uppercase tracking-[0.45em] text-illuvrse-muted">
              ILLUVRSE GAMEGRID
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight md:text-5xl">
              Arcade drops, one tap away.
            </h1>
            <p className="mt-4 text-base text-illuvrse-muted md:text-lg">
              GameGrid is the ILLUVRSE arcade wing. Quick matches, instant restarts, and
              competitive loops designed for mobile, tablet, and desktop.
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
        </div>
      </section>

      <section className="mx-auto mt-10 grid w-full max-w-6xl gap-6 md:grid-cols-[1.3fr_1fr]">
        <div className="rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-7">
          <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Now live</p>
          <h2 className="mt-3 font-display text-2xl font-semibold">PixelPuck</h2>
          <p className="mt-2 text-sm text-illuvrse-muted">
            World Air Hockey Tournament and 3v3 Arcade Hockey with Franchise mode.
            Built for quick sessions or full tournament runs.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-illuvrse-muted">
            <li>50-country World Air Hockey Tournament</li>
            <li>3v3 Arcade Hockey (solo + online)</li>
            <li>Franchise mode & roster management</li>
          </ul>
          <Link
            href="/pixelpuck/"
            className="mt-6 inline-flex rounded-full bg-illuvrse-glow px-5 py-2 text-sm font-semibold text-illuvrse-night"
          >
            Launch PixelPuck
          </Link>
        </div>
        <div className="rounded-3xl border border-illuvrse-stroke bg-gradient-to-br from-[#10192b] to-[#18263d] p-7">
          <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Next in queue</p>
          <h3 className="mt-3 text-lg font-semibold">Upcoming drops</h3>
          <ul className="mt-4 space-y-3 text-sm text-illuvrse-muted">
            <li>Gravity Sprint — endless runner with kinetic boosts</li>
            <li>Neon Tactics — 1v1 turn-based arena</li>
            <li>Starline Derby — co-op relay challenges</li>
          </ul>
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
            More games coming soon.
          </p>
        </div>
      </section>
    </main>
  );
}
