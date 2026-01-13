"use client";

import { useEffect, useState } from "react";

type WatchlistButtonProps = {
  showId?: string;
  episodeId?: string;
  className?: string;
};

export default function WatchlistButton({
  showId,
  episodeId,
  className = "",
}: WatchlistButtonProps) {
  const [inList, setInList] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading">("idle");

  const query = showId
    ? `showId=${encodeURIComponent(showId)}`
    : `episodeId=${encodeURIComponent(episodeId || "")}`;

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const res = await fetch(`/api/watchlist?${query}`);
        if (!res.ok) return;
        const data = (await res.json()) as { inList?: boolean };
        if (active && typeof data.inList === "boolean") {
          setInList(data.inList);
        }
      } catch {
        // Ignore auth/network errors.
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [query]);

  const toggle = async () => {
    if (!showId && !episodeId) return;
    setStatus("loading");
    try {
      if (inList) {
        await fetch(`/api/watchlist?${query}`, { method: "DELETE" });
        setInList(false);
      } else {
        await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ showId, episodeId }),
        });
        setInList(true);
      }
    } finally {
      setStatus("idle");
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={inList}
      className={`rounded-full border border-illuvrse-stroke px-6 py-3 text-sm font-semibold text-illuvrse-snow transition hover:border-illuvrse-electric hover:text-illuvrse-electric ${className}`}
      disabled={status === "loading"}
    >
      {inList ? "In My List" : "Add to My List"}
    </button>
  );
}
