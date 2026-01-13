"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navItems = [
  { label: "Streaming", href: "/home" },
  { label: "GameGrid", href: "/gamegrid" },
  { label: "Search", href: "/search" },
  { label: "Radio", href: "/radio" },
  { label: "Admin", href: "/admin" },
  { label: "Profile", href: "/profile" },
];

export default function Header() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isTyping) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-illuvrse-stroke bg-illuvrse-night/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-3 text-illuvrse-snow">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-illuvrse-electric/20 text-lg font-semibold text-illuvrse-electric">
            I
          </span>
          <div className="leading-none">
            <p className="text-lg font-semibold tracking-[0.2em] text-illuvrse-snow">
              ILLUVRSE
            </p>
            <p className="text-xs uppercase text-illuvrse-muted">Stream the metaverse</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-illuvrse-muted md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-illuvrse-snow"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form
          onSubmit={handleSubmit}
          className="hidden flex-1 items-center justify-center md:flex"
        >
          <div className="relative w-full max-w-sm">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search shows or episodes"
              aria-label="Search shows or episodes"
              className="w-full rounded-full border border-illuvrse-stroke bg-illuvrse-panel/80 px-4 py-2 pr-14 text-sm text-illuvrse-snow placeholder:text-illuvrse-muted"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-illuvrse-stroke px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-illuvrse-muted">
              Cmd+K
            </span>
          </div>
        </form>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full border border-illuvrse-stroke px-4 py-2 text-sm text-illuvrse-snow transition hover:border-illuvrse-electric hover:text-illuvrse-electric"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-illuvrse-ember px-4 py-2 text-sm font-semibold text-illuvrse-night transition hover:bg-illuvrse-glow"
          >
            Join now
          </Link>
        </div>
      </div>
    </header>
  );
}
