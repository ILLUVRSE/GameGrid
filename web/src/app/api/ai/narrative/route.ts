import { NextRequest, NextResponse } from "next/server";

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_PROMPT_CHARS = 6000;
const MAX_TOKENS_CAP = 1200;

type NarrativeRequest = {
  prompt?: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
};

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY on the server." },
      { status: 500 },
    );
  }

  let payload: NarrativeRequest;
  try {
    payload = (await req.json()) as NarrativeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = payload.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const context = payload.context?.trim();
  const maxTokensRaw = Number(payload.maxTokens ?? 600);
  const maxTokens = Number.isFinite(maxTokensRaw)
    ? Math.min(Math.max(maxTokensRaw, 120), MAX_TOKENS_CAP)
    : 600;
  const temperatureRaw = Number(payload.temperature ?? 0.8);
  const temperature = Number.isFinite(temperatureRaw)
    ? Math.min(Math.max(temperatureRaw, 0), 1.2)
    : 0.8;

  const systemPrompt = [
    "You are the narrative engine for the ILLUVRSE streaming platform.",
    "Write cinematic, vivid, and emotionally grounded story copy.",
    "Keep it actionable for producers: clear hooks, stakes, and tone.",
  ].join(" ");

  const messages = [
    { role: "system", content: systemPrompt },
    ...(context ? [{ role: "system", content: `Context: ${context}` }] : []),
    { role: "user", content: prompt.slice(0, MAX_PROMPT_CHARS) },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: "OpenAI request failed.", detail },
      { status: response.status },
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim() ?? "";

  return NextResponse.json({
    content,
    model: data?.model ?? DEFAULT_MODEL,
    usage: data?.usage ?? null,
  });
}
