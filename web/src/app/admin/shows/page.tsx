"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Show = {
  id: string;
  slug: string;
  title: string;
  synopsis?: string;
};

export default function AdminShowsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Show>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    fetchShows();
  }, []);

  const fetchShows = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/shows");
      if (!res.ok) throw new Error(`Failed to fetch shows`);
      const data = await res.json();
      setShows(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch("/api/admin/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save show");
      setForm({});
      fetchShows();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this show?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/shows/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete show");
      fetchShows();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    }
  };

  const handleGenerateMetadata = async (id: string) => {
    setGeneratingId(id);
    setError(null);
    try {
      const res = await fetch("/api/ai/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "show", id }),
      });
      if (!res.ok) throw new Error("Failed to generate metadata");
      fetchShows();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Admin Shows</h1>
        <Link href="/admin/shows/new" className="text-sm font-semibold text-blue-600">
          New show
        </Link>
      </div>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="mb-8 p-4 border rounded bg-gray-50">
        <div className="mb-2">
          <label className="block font-semibold" htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            value={form.title || ""}
            onChange={handleInputChange}
            required
            className="w-full border px-2 py-1 rounded"
          />
        </div>
        <div className="mb-2">
          <label className="block font-semibold" htmlFor="slug">Slug</label>
          <input
            id="slug"
            name="slug"
            value={form.slug || ""}
            onChange={handleInputChange}
            className="w-full border px-2 py-1 rounded"
          />
          <p className="text-xs text-gray-500 mt-1">Optional. Leave empty to auto-generate.</p>
        </div>
        <div className="mb-2">
          <label className="block font-semibold" htmlFor="synopsis">Synopsis</label>
          <textarea
            id="synopsis"
            name="synopsis"
            value={form.synopsis || ""}
            onChange={handleInputChange}
            className="w-full border px-2 py-1 rounded"
            rows={2}
          />
        </div>
        <div className="flex space-x-4 mt-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Create Show
          </button>
        </div>
      </form>

      <h2 className="text-xl font-semibold mb-2">Shows List</h2>

      {loading ? (
        <div>Loading...</div>
      ) : shows.length === 0 ? (
        <div>No shows found.</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-3 border">Title</th>
              <th className="py-2 px-3 border">Slug</th>
              <th className="py-2 px-3 border">Synopsis</th>
              <th className="py-2 px-3 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shows.map((show) => (
              <tr key={show.id} className="hover:bg-gray-50">
                <td className="py-2 px-3 border">{show.title}</td>
                <td className="py-2 px-3 border">{show.slug}</td>
                <td className="py-2 px-3 border">{show.synopsis || "-"}</td>
                <td className="py-2 px-3 border">
                  <Link
                    href={`/admin/shows/${show.id}/edit`}
                    className="text-blue-600 hover:underline mr-4"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleGenerateMetadata(show.id)}
                    className="text-emerald-600 hover:underline mr-4"
                    disabled={generatingId === show.id}
                  >
                    {generatingId === show.id ? "Generating..." : "Generate metadata"}
                  </button>
                  <button
                    onClick={() => handleDelete(show.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
