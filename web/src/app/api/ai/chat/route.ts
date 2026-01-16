import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai/openai";
import { semanticSearch } from "@/lib/ai/embeddings";
import { logAiUsage } from "@/lib/ai/cost";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


type ChatRequest = {
  prompt?: string;
  limit?: number;
};

const CHAT_MODEL = process.env.OPENAI_MODEL_CHAT || "gpt-4.1";


function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const limit = Math.min(Math.max(Number(body.limit || 8), 3), 12);

  let candidateIds: Array<{ type: "show" | "episode"; id: string }> = [];
  try {
    const semanticResults = await semanticSearch(prompt, limit * 2);
    candidateIds = semanticResults.slice(0, limit).map((item) => ({
      type: item.type,
      id: item.id,
    }));
  } catch {
    // fall back to recent content
  }

  if (candidateIds.length === 0) {
    const [shows, episodes] = await Promise.all([
      prisma.show.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
      prisma.episode.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
    ]);
    candidateIds = [
      ...shows.map((show) => ({ type: "show" as const, id: show.id })),
      ...episodes.map((episode) => ({ type: "episode" as const, id: episode.id })),
    ].slice(0, limit);
  }

  const showIds = candidateIds.filter((c) => c.type === "show").map((c) => c.id);
  const episodeIds = candidateIds.filter((c) => c.type === "episode").map((c) => c.id);

  const [shows, episodes] = await Promise.all([
    prisma.show.findMany({ where: { id: { in: showIds } } }),
    prisma.episode.findMany({
      where: { id: { in: episodeIds } },
      include: { season: { include: { show: true } } },
    }),
  ]);

  const catalog = [
    ...shows.map((show) => ({
      type: "show" as const,
      id: show.id,
      title: show.title,
      synopsis: show.synopsis,
      tags: show.tags,
      genres: show.genres,
    })),
    ...episodes.map((episode) => ({
      type: "episode" as const,
      id: episode.id,
      title: episode.title,
      synopsis: episode.synopsis,
      showTitle: episode.season.show.title,
      seasonNumber: episode.season.number,
      tags: episode.tags,
    })),
  ];

  const response = await chatCompletion({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a streaming concierge. Recommend ONLY from the provided catalog list. Output JSON only.",
      },
      {
        role: "user",
        content: [
          `User request: ${prompt}`,
          "Catalog (use these IDs only):",
          JSON.stringify(catalog),
          "Return JSON with keys: message, recommendations (array of {type, id, reason}).",
        ].join("\n"),
      },
    ],
    temperature: 0.5,
    maxTokens: 500,
    responseFormat: { type: "json_object" },
  });

  const content = response?.choices?.[0]?.message?.content || "{}";
  const parsed = safeJsonParse(content) || {};
  await logAiUsage({
    route: "/api/ai/chat",
    model: response?.model || CHAT_MODEL,
    usage: response?.usage,
  });

  const allowed = new Set(catalog.map((item) => `${item.type}:${item.id}`));
  const recommendations = Array.isArray(parsed.recommendations)
    ? parsed.recommendations.filter(
        (rec: { type?: string; id?: string }) =>
          typeof rec?.type === "string" &&
          typeof rec?.id === "string" &&
          allowed.has(`${rec.type}:${rec.id}`),
      )
    : [];

  const message =
    typeof parsed.message === "string" && parsed.message.trim().length > 0
      ? parsed.message.trim()
      : "Here are a few picks from the catalog based on your request.";

  return NextResponse.json({
    message,
    recommendations,
    citations: recommendations.map((rec: { type: string; id: string }) => ({
      type: rec.type,
      id: rec.id,
    })),
  });
}
