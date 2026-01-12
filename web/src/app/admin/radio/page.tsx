"use client";

import { useState } from "react";

type Station = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  items: Array<{
    id: string;
    position: number;
    episode: {
      id: string;
      title: string;
      season: { number: number; show: { title: string } };
    };
  }>;
};

export default function AdminRadioPage() {
  const [theme, setTheme] = useState("ILLUVRSE night drive");
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/radio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      if (!res.ok) throw new Error("Failed to generate station");
      setStation((await res.json()) as Station);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <h1 className="text-2xl font-bold mb-4">Admin Radio</h1>
      <div className="rounded border p-4 bg-gray-50">
        <label className="text-sm font-semibold">
          Theme
          <input
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <button
          type="button"
          onClick={handleGenerate}
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate station"}
        </button>
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      </div>

      {station && (
        <div className="mt-6 space-y-4">
          <div className="rounded border p-4">
            <div className="text-sm text-gray-500">Station</div>
            <div className="text-lg font-semibold">{station.name}</div>
            <div className="text-sm text-gray-600">{station.description}</div>
          </div>
          <div className="rounded border p-4">
            <div className="text-sm text-gray-500">Queue</div>
            <ul className="mt-2 space-y-2 text-sm">
              {station.items.map((item) => (
                <li key={item.id}>
                  {item.position}. {item.episode.season.show.title} · S
                  {item.episode.season.number} · {item.episode.title}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
