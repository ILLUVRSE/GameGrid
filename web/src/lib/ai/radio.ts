import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/ai/openai";
import { semanticSearch } from "@/lib/ai/embeddings";
import { logAiUsage } from "@/lib/ai/cost";

const DEFAULT_MODEL = process.env.OPENAI_MODEL_CHANNEL || "gpt-4o-mini";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function generateStationDetails(theme: string, model: string) {
  const prompt = [
    "Create a thematic streaming station for a sci-fi streaming app.",
    "Return JSON with keys: name, description.",
    `Theme: ${theme}`,
  ].join("\n");

  const response = await chatCompletion({
    model,
    messages: [
      {
        role: "system",
        content: "You output only JSON. Do not include markdown or extra text.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.8,
    maxTokens: 200,
    responseFormat: { type: "json_object" },
  });

  const content = response?.choices?.[0]?.message?.content || "{}";
  await logAiUsage({
    route: "/api/ai/radio",
    model: response?.model || model,
    usage: response?.usage,
  });

  try {
    return JSON.parse(content);
  } catch {
    return { name: theme, description: `A themed station for ${theme}.` };
  }
}

async function pickEpisodesByTheme(theme: string, limit: number) {
  try {
    const semanticResults = await semanticSearch(theme, limit * 2);
    const episodeIds = semanticResults
      .filter((result) => result.type === "episode")
      .slice(0, limit)
      .map((result) => result.id);

    if (episodeIds.length > 0) {
      return episodeIds;
    }
  } catch {
    // fall back to recent episodes
  }

  const episodes = await prisma.episode.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return episodes.map((episode) => episode.id);
}

export async function createStation(params: {
  theme: string;
  limit: number;
  model?: string;
}) {
  const model = params.model || DEFAULT_MODEL;
  const details = await generateStationDetails(params.theme, model);
  const name = typeof details.name === "string" && details.name.trim().length > 0
    ? details.name.trim()
    : params.theme;
  const description =
    typeof details.description === "string" ? details.description.trim() : null;

  const baseSlug = slugify(name || params.theme) || `station-${Date.now()}`;
  const existing = await prisma.station.findFirst({ where: { slug: baseSlug } });
  const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;

  const episodeIds = await pickEpisodesByTheme(params.theme, params.limit);

  return prisma.station.create({
    data: {
      name,
      description,
      rulesJson: { theme: params.theme, limit: params.limit },
      slug,
      isAiGenerated: true,
      items: {
        create: episodeIds.map((episodeId, index) => ({
          episodeId,
          position: index + 1,
        })),
      },
    },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { episode: { include: { season: { include: { show: true } } } } },
      },
    },
  });
}
