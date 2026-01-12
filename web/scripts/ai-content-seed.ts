import { PrismaClient } from "@prisma/client";
import { chatCompletion } from "../src/lib/ai/openai";
import { upsertEpisodeEmbedding, upsertShowEmbedding } from "../src/lib/ai/embeddings";

type EpisodeSeed = {
  number: number;
  title: string;
  synopsis: string;
};

type SeasonSeed = {
  number: number;
  title: string;
  synopsis: string;
  episodes: EpisodeSeed[];
};

type ShowSeed = {
  title: string;
  synopsis: string;
  logline?: string;
  genres?: string[];
  tags?: string[];
  maturityRating?: string;
  contentWarnings?: string[];
  kidsSafe?: boolean;
  seasons: SeasonSeed[];
};

const prisma = new PrismaClient();
const SEED_MODEL = process.env.OPENAI_MODEL_SEED || "gpt-4o-mini";

const SEED_THEMES = [
  "RiftRock Adventure",
  "Rizzle Labs",
  "CntrlSquad Cyber Action",
  "ColorCraft Kids Creative",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function generateShowSeed(theme: string) {
  const prompt = [
    "Generate demo streaming content for a sci-fi streaming app.",
    "Return JSON with keys: title, synopsis, logline, genres (array), tags (array), maturityRating, contentWarnings (array), kidsSafe (boolean), seasons.",
    "Each season: number, title, synopsis, episodes (array).",
    "Each episode: number, title, synopsis.",
    "Make 1 season with 3 episodes.",
    `Theme: ${theme}`,
  ].join("\n");

  const response = await chatCompletion({
    model: SEED_MODEL,
    messages: [
      {
        role: "system",
        content: "You output only JSON. Do not include markdown or extra text.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    maxTokens: 1200,
    responseFormat: { type: "json_object" },
  });

  const content = response?.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(content) as ShowSeed;
  } catch {
    throw new Error(`Failed to parse seed JSON for theme: ${theme}`);
  }
}

function formatShowEmbeddingInput(show: ShowSeed) {
  return [
    `Title: ${show.title}`,
    show.logline ? `Logline: ${show.logline}` : null,
    show.synopsis ? `Synopsis: ${show.synopsis}` : null,
    show.genres?.length ? `Genres: ${show.genres.join(", ")}` : null,
    show.tags?.length ? `Tags: ${show.tags.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatEpisodeEmbeddingInput(
  showTitle: string,
  seasonNumber: number,
  episode: EpisodeSeed,
  tags: string[] = [],
) {
  return [
    `Show: ${showTitle}`,
    `Season: ${seasonNumber}`,
    `Episode: ${episode.title}`,
    episode.synopsis ? `Synopsis: ${episode.synopsis}` : null,
    tags.length ? `Tags: ${tags.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function seedShow(showSeed: ShowSeed) {
  const slug = slugify(showSeed.title);
  const show = await prisma.show.upsert({
    where: { slug },
    update: {
      title: showSeed.title,
      synopsis: showSeed.synopsis,
      logline: showSeed.logline ?? null,
      genres: showSeed.genres ?? [],
      tags: showSeed.tags ?? [],
      maturityRating: showSeed.maturityRating ?? null,
      contentWarnings: showSeed.contentWarnings ?? [],
      kidsSafe: showSeed.kidsSafe ?? false,
      aiMetadataUpdatedAt: new Date(),
    },
    create: {
      slug,
      title: showSeed.title,
      synopsis: showSeed.synopsis,
      logline: showSeed.logline ?? null,
      genres: showSeed.genres ?? [],
      tags: showSeed.tags ?? [],
      maturityRating: showSeed.maturityRating ?? null,
      contentWarnings: showSeed.contentWarnings ?? [],
      kidsSafe: showSeed.kidsSafe ?? false,
      aiMetadataUpdatedAt: new Date(),
    },
  });

  for (const seasonSeed of showSeed.seasons) {
    const season = await prisma.season.upsert({
      where: { showId_number: { showId: show.id, number: seasonSeed.number } },
      update: {
        title: seasonSeed.title,
        synopsis: seasonSeed.synopsis,
      },
      create: {
        showId: show.id,
        number: seasonSeed.number,
        title: seasonSeed.title,
        synopsis: seasonSeed.synopsis,
      },
    });

    for (const episodeSeed of seasonSeed.episodes) {
      await prisma.episode.upsert({
        where: { seasonId_number: { seasonId: season.id, number: episodeSeed.number } },
        update: {
          title: episodeSeed.title,
          synopsis: episodeSeed.synopsis,
        },
        create: {
          seasonId: season.id,
          number: episodeSeed.number,
          title: episodeSeed.title,
          synopsis: episodeSeed.synopsis,
        },
      });
    }
  }

  await upsertShowEmbedding(show.id, formatShowEmbeddingInput(showSeed));

  const episodes = await prisma.episode.findMany({
    where: { season: { showId: show.id } },
    include: { season: true },
  });

  for (const episode of episodes) {
    const episodeSeed = showSeed.seasons
      .find((season) => season.number === episode.season.number)
      ?.episodes.find((item) => item.number === episode.number);
    if (!episodeSeed) continue;
    await upsertEpisodeEmbedding(
      episode.id,
      formatEpisodeEmbeddingInput(show.title, episode.season.number, episodeSeed, showSeed.tags),
    );
  }

  console.log(`Seeded ${show.title}`);
}

async function main() {
  for (const theme of SEED_THEMES) {
    const seed = await generateShowSeed(theme);
    await seedShow(seed);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
