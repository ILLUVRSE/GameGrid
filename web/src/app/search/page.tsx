"use client";

import { useState } from "react";
import Link from "next/link";

type SearchResult =
  | {
      type: "show";
      id: string;
      title: string;
      synopsis: string | null;
      slug: string;
    }
  | {
      type: "episode";
      id: string;
      title: string;
      synopsis: string | null;
      seasonNumber: number;
    };

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.results || []);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  return (
    <main className="min-h-screen bg-illuvrse-night px-6 pb-20 pt-10">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="font-display text-3xl font-semibold">Search the catalog</h1>
        <p className="mt-2 text-sm text-illuvrse-muted">
          Find shows, episodes, and fresh drops across the ILLUVRSE universe.
        </p>
        <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 md:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for a show or episode"
            className="flex-1 rounded-full border border-illuvrse-stroke bg-illuvrse-panel/80 px-5 py-3 text-sm text-illuvrse-snow placeholder:text-illuvrse-muted"
          />
          <button
            type="submit"
            className="rounded-full bg-illuvrse-electric px-6 py-3 text-sm font-semibold text-illuvrse-night"
          >
            Search
          </button>
        </form>

        <div className="mt-10 space-y-4">
          {status === "error" && (
            <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5 text-sm text-illuvrse-muted">
              Something went wrong. Please try again.
            </div>
          )}
          {status === "loading" && (
            <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5 text-sm text-illuvrse-muted">
              Searching the archive...
            </div>
          )}
          {status === "idle" && results.length === 0 && (
            <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5 text-sm text-illuvrse-muted">
              Try searching for the seeded title "ILLUVRSE" to see results.
            </div>
          )}
          {results.map((result) => (
            <div
              key={`${result.type}-${result.id}`}
              className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5"
            >
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                <span>{result.type}</span>
                {result.type === "episode" && (
                  <span>Season {result.seasonNumber}</span>
                )}
              </div>
              <h2 className="mt-3 text-lg font-semibold text-illuvrse-snow">
                {result.title}
              </h2>
              <p className="mt-2 text-sm text-illuvrse-muted">
                {result.synopsis || "No synopsis yet."}
              </p>
              {result.type === "show" && (
                <Link
                  href={`/show/${result.slug}`}
                  className="mt-4 inline-flex text-sm font-semibold text-illuvrse-electric"
                >
                  Open show
                </Link>
              )}
              {result.type === "episode" && (
                <Link
                  href={`/episode/${result.id}`}
                  className="mt-4 inline-flex text-sm font-semibold text-illuvrse-electric"
                >
                  Open episode
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
