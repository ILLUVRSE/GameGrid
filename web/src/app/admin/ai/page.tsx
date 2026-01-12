"use client";

import { useState } from "react";

export default function AdminAiPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState({ type: "show", id: "" });

  const runEmbed = async () => {
    setError(null);
    setStatus("Embedding catalog...");
    try {
      const res = await fetch("/api/ai/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "all", limit: 50 }),
      });
      if (!res.ok) throw new Error("Failed to embed catalog");
      const data = await res.json();
      setStatus(`Embedded: ${data.embedded?.shows ?? 0} shows, ${data.embedded?.episodes ?? 0} episodes.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus(null);
    }
  };

  const runMetadata = async () => {
    if (!metadata.id) {
      setError("Enter an ID to generate metadata.");
      return;
    }
    setError(null);
    setStatus("Generating metadata...");
    try {
      const res = await fetch("/api/ai/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: metadata.type, id: metadata.id }),
      });
      if (!res.ok) throw new Error("Failed to generate metadata");
      setStatus("Metadata generated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <h1 className="text-2xl font-bold mb-4">Admin AI</h1>
      <div className="rounded border p-4 bg-gray-50">
        <h2 className="font-semibold">Embeddings</h2>
        <p className="text-sm text-gray-600">
          Batch-embed shows and episodes for semantic search.
        </p>
        <button
          type="button"
          onClick={runEmbed}
          className="mt-3 rounded bg-blue-600 px-4 py-2 text-white"
        >
          Embed catalog
        </button>
      </div>

      <div className="mt-6 rounded border p-4 bg-gray-50">
        <h2 className="font-semibold">Metadata generator</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <select
            value={metadata.type}
            onChange={(event) =>
              setMetadata((prev) => ({ ...prev, type: event.target.value }))
            }
            className="rounded border px-2 py-1"
          >
            <option value="show">Show</option>
            <option value="episode">Episode</option>
          </select>
          <input
            value={metadata.id}
            onChange={(event) =>
              setMetadata((prev) => ({ ...prev, id: event.target.value }))
            }
            placeholder="Enter ID"
            className="rounded border px-2 py-1"
          />
          <button
            type="button"
            onClick={runMetadata}
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            Generate metadata
          </button>
        </div>
      </div>

      {status && <div className="mt-4 text-sm text-gray-700">{status}</div>}
      {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
    </div>
  );
}
