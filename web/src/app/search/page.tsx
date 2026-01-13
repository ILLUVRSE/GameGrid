"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
  const [filter, setFilter] = useState<"all" | "show" | "episode">("all");
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const searchParams = useSearchParams();

  const runSearch = async (
    term: string,
    options?: { append?: boolean; offset?: number },
  ) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const offset = options?.offset ?? 0;
    setStatus("loading");
    try {
      const typeParam = filter === "all" ? "" : `&type=${filter}`;
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(trimmed)}${typeParam}&offset=${offset}`,
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults((prev) =>
        options?.append ? [...prev, ...(data.results || [])] : data.results || [],
      );
      setNextOffset(typeof data.nextOffset === "number" ? data.nextOffset : null);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    const initialQuery = searchParams.get("q")?.trim() || "";
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
      runSearch(initialQuery, { offset: 0 });
    }
  }, [searchParams, query]);

  useEffect(() => {
    if (query.trim()) {
      runSearch(query, { offset: 0 });
    }
  }, [filter]);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    await runSearch(query, { offset: 0 });
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
        <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
          {(["all", "show", "episode"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`rounded-full border px-4 py-2 transition ${
                filter === value
                  ? "border-illuvrse-electric text-illuvrse-electric"
                  : "border-illuvrse-stroke text-illuvrse-muted hover:border-illuvrse-electric"
              }`}
            >
              {value === "all" ? "All" : value === "show" ? "Shows" : "Episodes"}
            </button>
          ))}
        </div>

        <div className="mt-10 space-y-4">
          {status === "error" && (
            <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5 text-sm text-illuvrse-muted">
              Something went wrong. Please try again.
            </div>
          )}
          {status === "loading" && (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/60 animate-pulse"
                />
              ))}
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
          {nextOffset !== null && status !== "loading" && results.length > 0 && (
            <button
              type="button"
              onClick={() => runSearch(query, { append: true, offset: nextOffset })}
              className="rounded-full border border-illuvrse-stroke px-6 py-3 text-sm font-semibold text-illuvrse-snow transition hover:border-illuvrse-electric hover:text-illuvrse-electric"
            >
              Load more
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
