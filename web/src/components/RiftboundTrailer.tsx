"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TrailerCue = {
  start: number;
  end: number;
  title: string;
  subtitle?: string;
  voice?: string;
};

const TRAILER_DURATION_SEC = 180;

const TRAILER_CUES: TrailerCue[] = [
  { start: 0, end: 5, title: "Two worlds. One breaking point." },
  {
    start: 5,
    end: 12,
    title: "A storm-split world",
    subtitle: "Ocean kingdom vs ember wasteland",
  },
  {
    start: 12,
    end: 20,
    title: "The line was meant to keep us safe.",
    voice: "Rizzle (VO)",
  },
  {
    start: 20,
    end: 25,
    title: "The line kept us hungry.",
    voice: "RiftRuck (VO)",
  },
  { start: 25, end: 35, title: "ORDER", subtitle: "Rizzle's discipline" },
  { start: 35, end: 45, title: "CHAOS", subtitle: "RiftRuck's fury" },
  {
    start: 45,
    end: 55,
    title: "Lightning tears the screen",
    subtitle: "Blue vs orange",
  },
  { start: 55, end: 65, title: "The rift feeds", subtitle: "Scouts turn to ash" },
  {
    start: 65,
    end: 75,
    title: "The war ignites",
    subtitle: "Armies collide",
  },
  { start: 75, end: 85, title: "Hold. Then break.", voice: "Admiral Maxx" },
  {
    start: 85,
    end: 95,
    title: "You two think you're enemies. Cute.",
    voice: "PandaMage",
  },
  {
    start: 95,
    end: 110,
    title: "The rift expands",
    subtitle: "First eye contact across the storm",
  },
  { start: 110, end: 120, title: "We’re not the problem.", voice: "PandaMage" },
  { start: 120, end: 130, title: "Then what is?", voice: "Rizzle" },
  {
    start: 130,
    end: 145,
    title: "The real threat awakens",
    subtitle: "Reality bends",
  },
  {
    start: 145,
    end: 158,
    title: "Enemies become allies",
    subtitle: "Lightning and fire in sync",
  },
  {
    start: 158,
    end: 170,
    title: "The war was just the beginning",
  },
  { start: 170, end: 176, title: "Rizzle. RiftRuck. Maxx. PandaMage." },
  { start: 176, end: 180, title: "RIFTBOUND", subtitle: "Coming soon" },
];

type RiftboundTrailerProps = {
  heroImageUrl?: string | null;
};

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
};

export default function RiftboundTrailer({ heroImageUrl }: RiftboundTrailerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const startRef = useRef<number | null>(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    const tick = (now: number) => {
      if (startRef.current === null) {
        startRef.current = now;
      }
      const elapsed = (now - startRef.current) / 1000;
      const nextTime = Math.min(
        TRAILER_DURATION_SEC,
        offsetRef.current + elapsed,
      );
      setCurrentTime(nextTime);
      if (nextTime >= TRAILER_DURATION_SEC) {
        setIsPlaying(false);
        offsetRef.current = nextTime;
        startRef.current = null;
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const activeCue = useMemo(() => {
    return (
      TRAILER_CUES.find(
        (cue) => currentTime >= cue.start && currentTime < cue.end,
      ) ?? TRAILER_CUES[TRAILER_CUES.length - 1]
    );
  }, [currentTime]);

  const progress = Math.min(1, currentTime / TRAILER_DURATION_SEC);
  const pulse = 0.55 + Math.sin(currentTime * 0.9) * 0.25;

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      offsetRef.current = currentTime;
      startRef.current = null;
      return;
    }
    if (currentTime >= TRAILER_DURATION_SEC) {
      setCurrentTime(0);
      offsetRef.current = 0;
    }
    setIsPlaying(true);
  };

  const handleSeek = (value: number) => {
    const clamped = Math.min(TRAILER_DURATION_SEC, Math.max(0, value));
    setCurrentTime(clamped);
    offsetRef.current = clamped;
    startRef.current = null;
  };

  return (
    <div className="rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
            Official trailer
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold">
            Riftbound — 3:00
          </h2>
        </div>
        <button
          type="button"
          onClick={togglePlay}
          className="rounded-full bg-illuvrse-glow px-6 py-3 text-sm font-semibold text-illuvrse-night transition hover:bg-illuvrse-ember"
        >
          {isPlaying ? "Pause trailer" : currentTime >= TRAILER_DURATION_SEC ? "Replay" : "Play trailer"}
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-illuvrse-stroke bg-black">
        <div className="relative aspect-video">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.35),transparent_55%),radial-gradient(circle_at_80%_60%,rgba(249,115,22,0.35),transparent_55%)]" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0b1430] via-[#111c34] to-[#1f1320] opacity-90" />
            {heroImageUrl && (
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `url(${heroImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            )}
            <div
              className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-gradient-to-b from-transparent via-illuvrse-electric to-transparent"
              style={{ opacity: pulse }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-illuvrse-electric/30 via-transparent to-illuvrse-ember/30" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between p-6 md:p-10">
            <div className="flex items-start justify-between text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
              <span>PG-13</span>
              <span>{formatTime(currentTime)}</span>
            </div>
            <div className="max-w-xl">
              <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                Now playing
              </p>
              <h3 className="mt-3 font-display text-2xl font-semibold md:text-3xl">
                {activeCue.title}
              </h3>
              {activeCue.subtitle && (
                <p className="mt-2 text-sm text-illuvrse-muted">
                  {activeCue.subtitle}
                </p>
              )}
              {activeCue.voice && (
                <p className="mt-3 text-xs uppercase tracking-[0.3em] text-illuvrse-electric">
                  {activeCue.voice}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-illuvrse-night">
                <div
                  className="h-full bg-gradient-to-r from-illuvrse-electric via-illuvrse-glow to-illuvrse-ember"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <span className="text-xs text-illuvrse-muted">
                {formatTime(TRAILER_DURATION_SEC)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <label className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
          Scrub trailer
          <input
            type="range"
            min={0}
            max={TRAILER_DURATION_SEC}
            step={1}
            value={Math.round(currentTime)}
            onChange={(event) => handleSeek(Number(event.target.value))}
            className="mt-3 h-2 w-full cursor-pointer accent-illuvrse-electric"
          />
        </label>
        <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/60 px-4 py-3 text-xs text-illuvrse-muted">
          Timed animatic prototype
        </div>
      </div>
    </div>
  );
}
