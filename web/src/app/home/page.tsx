"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RailItem =
  | {
      type: "show";
      id: string;
      title: string;
      synopsis: string | null;
      slug: string;
      posterUrl?: string | null;
    }
  | {
      type: "episode";
      id: string;
      title: string;
      synopsis: string | null;
      seasonNumber: number;
      showTitle: string;
      showSlug: string;
      progressSec?: number | null;
      durationSec?: number | null;
    };

type HomePayload = {
  featured: { id: string; title: string; synopsis: string | null; slug: string } | null;
  rails: Array<{ id: string; title: string; items: RailItem[] }>;
};

export default function HomePage() {
  const [payload, setPayload] = useState<HomePayload | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/home");
        if (!res.ok) throw new Error("Failed to load");
        const data = (await res.json()) as HomePayload;
        setPayload(data);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    };
    run();
  }, []);

  const featured = payload?.featured;
  const formatProgress = (position: number, duration?: number | null) => {
    const minutes = Math.max(1, Math.round(position / 60));
    if (duration && duration > 0) {
      const remaining = Math.max(0, Math.round((duration - position) / 60));
      return `${minutes} min in · ${remaining} min left`;
    }
    return `${minutes} min in`;
  };

  return (
    <main className="min-h-screen bg-illuvrse-night px-6 pb-20 pt-10 text-illuvrse-snow">
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-3xl border border-illuvrse-stroke bg-gradient-to-br from-illuvrse-dusk via-[#1b2439] to-[#0f1627] p-10">
          <p className="text-xs uppercase tracking-[0.4em] text-illuvrse-muted">
            Home
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold">
            {featured?.title || "Welcome back"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-illuvrse-muted">
            {featured?.synopsis || "Your rails are warming up with new drops."}
          </p>
          {featured && (
            <Link
              href={`/show/${featured.slug}`}
              className="mt-6 inline-flex rounded-full bg-illuvrse-glow px-6 py-3 text-sm font-semibold text-illuvrse-night"
            >
              Resume show
            </Link>
          )}
        </div>

        {status === "error" && (
          <div className="mt-6 rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5 text-sm text-illuvrse-muted">
            Unable to load rails right now.
          </div>
        )}

        {status === "loading" && (
          <div className="mt-6 space-y-8">
            {[0, 1].map((rail) => (
              <div key={rail}>
                <div className="h-6 w-48 rounded-full bg-illuvrse-panel/70 animate-pulse" />
                <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-36 rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/50 animate-pulse"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {status === "ready" &&
          payload?.rails.map((rail) => (
            <section key={rail.id} className="mt-10">
              <h2 className="font-display text-2xl font-semibold">{rail.title}</h2>
              <div className="mt-4 flex gap-4 overflow-x-auto pb-3 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-4">
                {rail.items.map((item) =>
                  item.type === "show" ? (
                    <Link
                      key={item.id}
                      href={`/show/${item.slug}`}
                      className="min-w-[240px] rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-4 text-sm text-illuvrse-muted transition hover:border-illuvrse-electric md:min-w-0"
                    >
                      {item.posterUrl ? (
                        <img
                          src={item.posterUrl}
                          alt={`${item.title} poster`}
                          className="h-32 w-full rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-32 w-full items-center justify-center rounded-xl border border-illuvrse-stroke bg-illuvrse-panel/60 text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                          Poster
                        </div>
                      )}
                      <p className="mt-4 text-xs uppercase tracking-[0.3em]">Show</p>
                      <h3 className="mt-2 text-lg font-semibold text-illuvrse-snow">
                        {item.title}
                      </h3>
                      <p className="mt-2 line-clamp-3">{item.synopsis || "No synopsis yet."}</p>
                    </Link>
                  ) : (
                    <Link
                      key={item.id}
                      href={item.progressSec ? `/watch/${item.id}` : `/episode/${item.id}`}
                      className="min-w-[240px] rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-4 text-sm text-illuvrse-muted transition hover:border-illuvrse-electric md:min-w-0"
                    >
                      <p className="text-xs uppercase tracking-[0.3em]">Episode</p>
                      <h3 className="mt-2 text-lg font-semibold text-illuvrse-snow">
                        {item.title}
                      </h3>
                      <p className="mt-2 line-clamp-3">{item.synopsis || "No synopsis yet."}</p>
                      <p className="mt-3 text-xs text-illuvrse-muted">
                        {item.showTitle} · Season {item.seasonNumber}
                      </p>
                      {typeof item.progressSec === "number" && item.progressSec > 0 && (
                        <p className="mt-3 text-xs uppercase tracking-[0.3em] text-illuvrse-glow">
                          {formatProgress(item.progressSec, item.durationSec)}
                        </p>
                      )}
                    </Link>
                  ),
                )}
              </div>
            </section>
          ))}
      </div>
    </main>
  );
}
