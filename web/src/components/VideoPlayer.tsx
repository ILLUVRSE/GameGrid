"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type VideoPlayerProps = {
  episodeId: string;
  hlsUrl?: string | null;
  sourceUrl?: string | null;
  posterUrl?: string | null;
};

const MIN_PROGRESS_DELTA_SEC = 15;

export default function VideoPlayer({
  episodeId,
  hlsUrl,
  sourceUrl,
  posterUrl,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resumePositionRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);
  const startedRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");

  const activeSource = useMemo(() => {
    if (hlsUrl) {
      return { url: hlsUrl, type: "application/x-mpegURL" };
    }
    if (sourceUrl) {
      return { url: sourceUrl, type: "video/mp4" };
    }
    return null;
  }, [hlsUrl, sourceUrl]);

  const pushProgress = async (position: number) => {
    if (Number.isNaN(position) || position < 0) return;
    if (Math.abs(position - lastSentRef.current) < MIN_PROGRESS_DELTA_SEC) return;
    lastSentRef.current = position;
    try {
      await fetch("/api/watch-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId, position: Math.round(position) }),
        keepalive: true,
      });
    } catch {
      // Ignore transient network/auth errors.
    }
  };

  const trackEvent = async (event: string, position?: number) => {
    try {
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          episodeId,
          position: typeof position === "number" ? Math.round(position) : undefined,
        }),
        keepalive: true,
      });
    } catch {
      // Ignore analytics errors.
    }
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      setStatus("loading");
      try {
        const res = await fetch(`/api/watch-progress?episodeId=${episodeId}`);
        if (!res.ok) {
          if (active) setStatus("ready");
          return;
        }
        const data = (await res.json()) as { position?: number };
        if (!active) return;
        if (typeof data.position === "number" && data.position > 0) {
          resumePositionRef.current = data.position;
          if (videoRef.current?.readyState && videoRef.current.readyState > 0) {
            videoRef.current.currentTime = data.position;
          }
        }
      } finally {
        if (active) setStatus("ready");
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [episodeId]);

  const handleLoadedMetadata = () => {
    if (resumePositionRef.current && videoRef.current) {
      videoRef.current.currentTime = resumePositionRef.current;
    }
  };

  const handlePause = () => {
    const position = videoRef.current?.currentTime ?? 0;
    pushProgress(position);
    trackEvent("pause", position);
  };

  const handleTimeUpdate = () => {
    const position = videoRef.current?.currentTime ?? 0;
    pushProgress(position);
  };

  const handlePlay = () => {
    if (!startedRef.current) {
      startedRef.current = true;
      trackEvent("play_start", videoRef.current?.currentTime ?? 0);
    }
  };

  const handleEnded = () => {
    pushProgress(videoRef.current?.duration ?? 0);
    trackEvent("play_complete", videoRef.current?.duration ?? 0);
  };

  if (!activeSource) {
    return (
      <div className="rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-8 text-sm text-illuvrse-muted">
        Video playback unavailable. Attach a video asset to enable streaming.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5">
      <video
        ref={videoRef}
        className="h-auto w-full rounded-2xl bg-black"
        controls
        playsInline
        poster={posterUrl ?? undefined}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onTimeUpdate={handleTimeUpdate}
        onPause={handlePause}
        onEnded={handleEnded}
      >
        <source src={activeSource.url} type={activeSource.type} />
        Your browser does not support the video tag.
      </video>
      {status === "loading" && (
        <p className="mt-3 text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
          Restoring playback position...
        </p>
      )}
    </div>
  );
}
