"use client";

import Link from "next/link";

export default function EpisodeError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-illuvrse-night px-6 py-20 text-illuvrse-snow">
      <div className="mx-auto w-full max-w-xl text-center">
        <h1 className="text-2xl font-semibold">Unable to load episode</h1>
        <p className="mt-3 text-sm text-illuvrse-muted">
          Something went wrong while loading this episode.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-illuvrse-glow px-6 py-3 text-sm font-semibold text-illuvrse-night"
          >
            Try again
          </button>
          <Link
            href="/home"
            className="rounded-full border border-illuvrse-stroke px-6 py-3 text-sm font-semibold text-illuvrse-snow"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
