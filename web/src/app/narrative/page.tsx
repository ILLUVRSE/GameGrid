"use client";

import { useMemo, useState } from "react";

const lengthToTokens: Record<string, number> = {
  short: 220,
  medium: 520,
  long: 900,
};

const examplePrompts = [
  "Pitch a new ILLUVRSE original about a rogue archivist who can rewind memories.",
  "Write a season 1 logline for a cosmic crime saga set in a floating city.",
  "Create a trailer voiceover for a thriller about time-bending streamers.",
];

export default function NarrativePage() {
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("Cinematic");
  const [focus, setFocus] = useState("Show pitch");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [temperature, setTemperature] = useState(0.8);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [usage, setUsage] = useState<{ total_tokens?: number } | null>(null);
  const [error, setError] = useState("");

  const context = useMemo(() => {
    const parts = [
      `Tone: ${tone}.`,
      focus ? `Focus: ${focus}.` : null,
      `Length: ${length}.`,
    ].filter(Boolean);
    return parts.join(" ");
  }, [tone, focus, length]);

  const submitPrompt = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) {
      setError("Add a prompt to generate a narrative response.");
      return;
    }

    setIsLoading(true);
    setError("");
    setResponse("");
    setUsage(null);

    try {
      const res = await fetch("/api/ai/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          context,
          maxTokens: lengthToTokens[length],
          temperature,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Narrative request failed.");
        return;
      }

      setResponse(data?.content || "");
      setUsage(data?.usage || null);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="illuvrse-grid min-h-screen bg-illuvrse-night">
      <section className="mx-auto w-full max-w-5xl px-6 pb-16 pt-12">
        <div className="rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/80 p-8 md:p-12">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
              ILLUVRSE Narrative Studio
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold md:text-4xl">
              Generate cinematic story beats on demand
            </h1>
            <p className="mt-3 text-base text-illuvrse-muted md:text-lg">
              Use your OpenAI credits to craft show pitches, trailer copy, or episodic
              arcs for the ILLUVRSE streaming universe.
            </p>
          </div>

          <form onSubmit={submitPrompt} className="mt-10 space-y-6">
            <div>
              <label className="text-sm font-medium text-illuvrse-snow">Narrative prompt</label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={6}
                placeholder="Describe the scene, show, or narrative you want..."
                className="mt-2 w-full rounded-2xl border border-illuvrse-stroke bg-illuvrse-night/70 p-4 text-sm text-illuvrse-snow outline-none transition focus:border-illuvrse-electric"
              />
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-illuvrse-muted">
                {examplePrompts.map((example) => (
                  <button
                    type="button"
                    key={example}
                    onClick={() => setPrompt(example)}
                    className="rounded-full border border-illuvrse-stroke px-3 py-1 transition hover:border-illuvrse-electric hover:text-illuvrse-snow"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-illuvrse-snow">
                Tone
                <select
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-illuvrse-stroke bg-illuvrse-night/70 px-3 py-2 text-sm text-illuvrse-snow"
                >
                  {["Cinematic", "Gritty", "Dreamlike", "Epic", "Intimate"].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-illuvrse-snow">
                Focus
                <input
                  value={focus}
                  onChange={(event) => setFocus(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-illuvrse-stroke bg-illuvrse-night/70 px-3 py-2 text-sm text-illuvrse-snow"
                  placeholder="Show pitch, trailer, episode beat..."
                />
              </label>

              <label className="text-sm font-medium text-illuvrse-snow">
                Length
                <select
                  value={length}
                  onChange={(event) => setLength(event.target.value as "short" | "medium" | "long")}
                  className="mt-2 w-full rounded-xl border border-illuvrse-stroke bg-illuvrse-night/70 px-3 py-2 text-sm text-illuvrse-snow"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </label>
            </div>

            <label className="text-sm font-medium text-illuvrse-snow">
              Temperature
              <input
                type="range"
                min={0}
                max={1.2}
                step={0.1}
                value={temperature}
                onChange={(event) => setTemperature(Number(event.target.value))}
                className="mt-3 w-full accent-illuvrse-electric"
              />
              <span className="mt-2 block text-xs text-illuvrse-muted">
                {temperature.toFixed(1)} = crisp and focused, higher = more experimental.
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="rounded-full bg-illuvrse-glow px-6 py-3 text-sm font-semibold text-illuvrse-night transition hover:bg-illuvrse-ember disabled:opacity-60"
            >
              {isLoading ? "Generating..." : "Generate narrative"}
            </button>
          </form>
        </div>

        <div className="mt-8 rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-8">
          <h2 className="text-lg font-semibold">Narrative output</h2>
          {error ? (
            <p className="mt-3 text-sm text-illuvrse-ember">{error}</p>
          ) : response ? (
            <>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-illuvrse-snow">
                {response}
              </p>
              {usage?.total_tokens ? (
                <p className="mt-4 text-xs text-illuvrse-muted">
                  Tokens used: {usage.total_tokens}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-sm text-illuvrse-muted">
              Your generated narrative will appear here.
            </p>
          )}
        </div>

        <p className="mt-6 text-xs text-illuvrse-muted">
          Requires `OPENAI_API_KEY` in `web/.env` to run on the server.
        </p>
      </section>
    </main>
  );
}
