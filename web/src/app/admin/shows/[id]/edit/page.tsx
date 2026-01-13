"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Show = {
  id: string;
  title: string;
  slug: string;
  synopsis: string | null;
  heroImageUrl: string | null;
  posterUrl: string | null;
};

export default function AdminShowEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [form, setForm] = useState<Show | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/shows/${params.id}`);
        if (!res.ok) throw new Error("Failed to load show");
        const data = (await res.json()) as Show;
        setForm(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };
    load();
  }, [params.id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/shows/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          slug: form.slug,
          synopsis: form.synopsis,
          posterUrl: form.posterUrl,
          heroImageUrl: form.heroImageUrl,
        }),
      });
      if (!res.ok) throw new Error("Failed to update show");
      router.push("/admin/shows");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return <div className="p-8">Loading show...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      <h1 className="text-2xl font-bold mb-4">Edit show</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      <form onSubmit={handleSubmit} className="rounded border p-4 bg-gray-50">
        <label className="block text-sm font-semibold">
          Title
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            className="mt-1 w-full rounded border px-2 py-1"
            required
          />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Slug
          <input
            value={form.slug}
            onChange={(event) => setForm({ ...form, slug: event.target.value })}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Synopsis
          <textarea
            value={form.synopsis || ""}
            onChange={(event) => setForm({ ...form, synopsis: event.target.value })}
            className="mt-1 w-full rounded border px-2 py-1"
            rows={3}
          />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Poster URL
          <input
            value={form.posterUrl || ""}
            onChange={(event) => setForm({ ...form, posterUrl: event.target.value })}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Hero Image URL
          <input
            value={form.heroImageUrl || ""}
            onChange={(event) => setForm({ ...form, heroImageUrl: event.target.value })}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <button
          type="submit"
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
