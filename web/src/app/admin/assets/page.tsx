"use client";

import { useEffect, useState } from "react";

type Episode = {
  id: string;
  title: string;
  season: { number: number; show: { title: string } };
};

type Asset = {
  id: string;
  sourceUrl: string;
  hlsManifestUrl: string | null;
  durationSec: number | null;
  createdAt: string;
};

export default function AdminAssetsPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    sourceUrl: "",
    hlsManifestUrl: "",
    episodeId: "",
  });
  const [transcodingId, setTranscodingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [episodesRes, assetsRes] = await Promise.all([
          fetch("/api/admin/episodes"),
          fetch("/api/admin/assets"),
        ]);
        if (!episodesRes.ok || !assetsRes.ok) throw new Error("Failed to load");
        const episodesData = (await episodesRes.json()) as Episode[];
        const assetsData = (await assetsRes.json()) as Asset[];
        setEpisodes(episodesData);
        setAssets(assetsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/admin/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: form.sourceUrl,
          hlsManifestUrl: form.hlsManifestUrl || undefined,
          episodeId: form.episodeId || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create asset");
      const updated = await fetch("/api/admin/assets");
      setAssets((await updated.json()) as Asset[]);
      setForm({ sourceUrl: "", hlsManifestUrl: "", episodeId: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleTranscode = async (assetId: string) => {
    setTranscodingId(assetId);
    setError(null);
    try {
      const res = await fetch("/api/admin/transcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      });
      if (!res.ok) throw new Error("Transcode failed");
      const updated = await fetch("/api/admin/assets");
      setAssets((await updated.json()) as Asset[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setTranscodingId(null);
    }
  };

  if (loading) {
    return <div className="p-8">Loading assets...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      <h1 className="text-2xl font-bold mb-4">Admin Assets</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="mb-8 rounded border p-4 bg-gray-50">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold">
            Source URL
            <input
              value={form.sourceUrl}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, sourceUrl: event.target.value }))
              }
              className="mt-1 w-full rounded border px-2 py-1"
              required
            />
          </label>
          <label className="text-sm font-semibold">
            HLS Manifest URL
            <input
              value={form.hlsManifestUrl}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, hlsManifestUrl: event.target.value }))
              }
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </label>
        </div>
        <label className="mt-4 block text-sm font-semibold">
          Episode (optional)
          <select
            value={form.episodeId}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, episodeId: event.target.value }))
            }
            className="mt-1 w-full rounded border px-2 py-1"
          >
            <option value="">Not linked</option>
            {episodes.map((episode) => (
              <option key={episode.id} value={episode.id}>
                {episode.season.show.title} · S{episode.season.number} · {episode.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
        >
          Create asset
        </button>
      </form>

      <div className="space-y-3">
        {assets.map((asset) => (
          <div key={asset.id} className="rounded border p-4">
            <div className="text-sm text-gray-500">Asset {asset.id}</div>
            <div className="text-sm">Source: {asset.sourceUrl}</div>
            <div className="text-sm text-gray-600">
              HLS: {asset.hlsManifestUrl || "Not transcoded"}
            </div>
            <button
              type="button"
              className="mt-3 rounded bg-blue-600 px-3 py-1 text-xs text-white"
              onClick={() => handleTranscode(asset.id)}
              disabled={transcodingId === asset.id}
            >
              {transcodingId === asset.id ? "Transcoding..." : "Transcode to HLS"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
