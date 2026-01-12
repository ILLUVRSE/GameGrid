import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth/session";
import { Role } from "@prisma/client";
import { chatCompletion } from "@/lib/ai/openai";
import { runSafetyCheck } from "@/lib/ai/moderation";
import { upsertEpisodeEmbedding, upsertShowEmbedding } from "@/lib/ai/embeddings";
import { logAiUsage } from "@/lib/ai/cost";

type MetadataPayload = {
  type?: "show" | "episode";
  id?: string;
  force?: boolean;
};

const METADATA_MODEL = process.env.OPENAI_MODEL_METADATA || "gpt-4.1";

export const runtime = "nodejs";

function isAdmin(req: NextRequest) {
  const session = getSessionFromRequest(req);
  return session?.role === Role.ADMIN;
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function formatShowEmbeddingInput(show: {
  title: string;
  synopsis: string | null;
  logline: string | null;
  genres: string[];
  tags: string[];
}) {
  return [
    `Title: ${show.title}`,
    show.logline ? `Logline: ${show.logline}` : null,
    show.synopsis ? `Synopsis: ${show.synopsis}` : null,
    show.genres.length ? `Genres: ${show.genres.join(", ")}` : null,
    show.tags.length ? `Tags: ${show.tags.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatEpisodeEmbeddingInput(episode: {
  title: string;
  synopsis: string | null;
  logline: string | null;
  tags: string[];
  showTitle: string;
  seasonNumber: number;
}) {
  return [
    `Show: ${episode.showTitle}`,
    `Season: ${episode.seasonNumber}`,
    `Episode: ${episode.title}`,
    episode.logline ? `Logline: ${episode.logline}` : null,
    episode.synopsis ? `Synopsis: ${episode.synopsis}` : null,
    episode.tags.length ? `Tags: ${episode.tags.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: MetadataPayload;
  try {
    body = (await req.json()) as MetadataPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body.type || !body.id) {
    return NextResponse.json({ error: "Missing type or id." }, { status: 400 });
  }

  if (body.type === "show") {
    const show = await prisma.show.findUnique({ where: { id: body.id } });
    if (!show) {
      return NextResponse.json({ error: "Show not found." }, { status: 404 });
    }

    if (!body.force && show.aiMetadataUpdatedAt) {
      return NextResponse.json({ status: "cached", show });
    }

    const prompt = [
      "Generate metadata for this streaming show.",
      "Return JSON with keys: genres (array), tags (array), logline, seoDescription, maturityRating, contentWarnings (array), kidsSafe (boolean), kidsSafeReason.",
      "Keep tags short and useful for recommendations.",
      `Title: ${show.title}`,
      show.synopsis ? `Synopsis: ${show.synopsis}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const response = await chatCompletion({
      model: METADATA_MODEL,
      messages: [
        {
          role: "system",
          content: "You output only JSON. Do not include markdown or extra text.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      maxTokens: 400,
      responseFormat: { type: "json_object" },
    });

    const content = response?.choices?.[0]?.message?.content || "{}";
    const parsed = safeJsonParse(content) || {};
    await logAiUsage({
      route: "/api/ai/metadata",
      model: response?.model || METADATA_MODEL,
      usage: response?.usage,
    });

    const safetyText = [show.title, show.synopsis, parsed.logline, parsed.seoDescription]
      .filter(Boolean)
      .join(" ");
    const safety = safetyText ? await runSafetyCheck(safetyText) : { flagged: false };

    const updatedShow = await prisma.show.update({
      where: { id: show.id },
      data: {
        genres: Array.isArray(parsed.genres) ? parsed.genres : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        logline: typeof parsed.logline === "string" ? parsed.logline : null,
        seoDescription: typeof parsed.seoDescription === "string" ? parsed.seoDescription : null,
        maturityRating: typeof parsed.maturityRating === "string" ? parsed.maturityRating : null,
        contentWarnings: Array.isArray(parsed.contentWarnings) ? parsed.contentWarnings : [],
        kidsSafe: safety.flagged ? false : Boolean(parsed.kidsSafe),
        kidsSafeReason: safety.flagged
          ? "Flagged by safety check."
          : typeof parsed.kidsSafeReason === "string"
            ? parsed.kidsSafeReason
            : null,
        aiMetadataUpdatedAt: new Date(),
      },
    });

    const embeddingInput = formatShowEmbeddingInput(updatedShow);
    const embeddingResult = await upsertShowEmbedding(updatedShow.id, embeddingInput);
    await logAiUsage({
      route: "/api/ai/metadata/embedding",
      model: embeddingResult.model,
      usage: embeddingResult.usage,
    });

    return NextResponse.json({ status: "generated", show: updatedShow });
  }

  const episode = await prisma.episode.findUnique({
    where: { id: body.id },
    include: { season: { include: { show: true } } },
  });

  if (!episode) {
    return NextResponse.json({ error: "Episode not found." }, { status: 404 });
  }

  if (!body.force && episode.aiMetadataUpdatedAt) {
    return NextResponse.json({ status: "cached", episode });
  }

  const prompt = [
    "Generate metadata for this streaming episode.",
    "Return JSON with keys: tags (array), logline, seoDescription, maturityRating, contentWarnings (array), kidsSafe (boolean), kidsSafeReason.",
    `Show: ${episode.season.show.title}`,
    `Season: ${episode.season.number}`,
    `Episode: ${episode.title}`,
    episode.synopsis ? `Synopsis: ${episode.synopsis}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await chatCompletion({
    model: METADATA_MODEL,
    messages: [
      {
        role: "system",
        content: "You output only JSON. Do not include markdown or extra text.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.4,
    maxTokens: 400,
    responseFormat: { type: "json_object" },
  });

  const content = response?.choices?.[0]?.message?.content || "{}";
  const parsed = safeJsonParse(content) || {};
  await logAiUsage({
    route: "/api/ai/metadata",
    model: response?.model || METADATA_MODEL,
    usage: response?.usage,
  });

  const safetyText = [episode.title, episode.synopsis, parsed.logline, parsed.seoDescription]
    .filter(Boolean)
    .join(" ");
  const safety = safetyText ? await runSafetyCheck(safetyText) : { flagged: false };

  const updatedEpisode = await prisma.episode.update({
    where: { id: episode.id },
    data: {
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      logline: typeof parsed.logline === "string" ? parsed.logline : null,
      seoDescription: typeof parsed.seoDescription === "string" ? parsed.seoDescription : null,
      maturityRating: typeof parsed.maturityRating === "string" ? parsed.maturityRating : null,
      contentWarnings: Array.isArray(parsed.contentWarnings) ? parsed.contentWarnings : [],
      kidsSafe: safety.flagged ? false : Boolean(parsed.kidsSafe),
      kidsSafeReason: safety.flagged
        ? "Flagged by safety check."
        : typeof parsed.kidsSafeReason === "string"
          ? parsed.kidsSafeReason
          : null,
      aiMetadataUpdatedAt: new Date(),
    },
  });

  const embeddingInput = formatEpisodeEmbeddingInput({
    title: updatedEpisode.title,
    synopsis: updatedEpisode.synopsis,
    logline: updatedEpisode.logline,
    tags: updatedEpisode.tags,
    showTitle: episode.season.show.title,
    seasonNumber: episode.season.number,
  });
  const embeddingResult = await upsertEpisodeEmbedding(updatedEpisode.id, embeddingInput);
  await logAiUsage({
    route: "/api/ai/metadata/embedding",
    model: embeddingResult.model,
    usage: embeddingResult.usage,
  });

  return NextResponse.json({ status: "generated", episode: updatedEpisode });
}
