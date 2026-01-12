import React from "react";
import Link from "next/link";

export default function AdminDashboard() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600 mb-8">
          Welcome to the admin panel. Use the quick links below to manage the application.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { href: "/admin/shows", label: "Shows", detail: "Manage series metadata" },
            { href: "/admin/seasons", label: "Seasons", detail: "Create and organize seasons" },
            { href: "/admin/episodes", label: "Episodes", detail: "Add episodes and synopses" },
            { href: "/admin/assets", label: "Assets", detail: "Source + HLS manifests" },
            { href: "/admin/radio", label: "Radio", detail: "Generate stations" },
            { href: "/admin/ai", label: "AI", detail: "Metadata + embeddings" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="bg-white rounded-lg shadow hover:shadow-md transition p-6 cursor-pointer flex flex-col items-center">
                <span className="font-semibold text-lg">{item.label}</span>
                <span className="text-gray-500 text-sm mt-1">{item.detail}</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-12 text-center text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} Admin Dashboard
        </div>
      </div>
    </main>
  );
}
