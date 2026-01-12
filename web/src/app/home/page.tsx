"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RailItem =
  | { type: "show"; id: string; title: string; synopsis: string | null; slug: string }
  | {
      type: "episode";
      id: string;
      title: string;
      synopsis: string | null;
      seasonNumber: number;
      showTitle: string;
      showSlug: string;
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
          <div className="mt-6 rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5 text-sm text-illuvrse-muted">
            Loading your rails...
          </div>
        )}

        {status === "ready" &&
          payload?.rails.map((rail) => (
            <section key={rail.id} className="mt-10">
              <h2 className="font-display text-2xl font-semibold">{rail.title}</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {rail.items.map((item) =>
                  item.type === "show" ? (
                    <Link
                      key={item.id}
                      href={`/show/${item.slug}`}
                      className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-4 text-sm text-illuvrse-muted transition hover:border-illuvrse-electric"
                    >
                      <p className="text-xs uppercase tracking-[0.3em]">Show</p>
                      <h3 className="mt-2 text-lg font-semibold text-illuvrse-snow">
                        {item.title}
                      </h3>
                      <p className="mt-2 line-clamp-3">{item.synopsis || "No synopsis yet."}</p>
                    </Link>
                  ) : (
                    <Link
                      key={item.id}
                      href={`/episode/${item.id}`}
                      className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-4 text-sm text-illuvrse-muted transition hover:border-illuvrse-electric"
                    >
                      <p className="text-xs uppercase tracking-[0.3em]">Episode</p>
                      <h3 className="mt-2 text-lg font-semibold text-illuvrse-snow">
                        {item.title}
                      </h3>
                      <p className="mt-2 line-clamp-3">{item.synopsis || "No synopsis yet."}</p>
                      <p className="mt-3 text-xs text-illuvrse-muted">
                        {item.showTitle} · Season {item.seasonNumber}
                      </p>
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
