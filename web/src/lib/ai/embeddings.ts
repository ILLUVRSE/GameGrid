import { prisma } from "@/lib/prisma";
import { createEmbedding } from "@/lib/ai/openai";

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

function toVectorLiteral(values: number[]) {
  const cleaned = values
    .filter((value) => Number.isFinite(value))
    .slice(0, EMBEDDING_DIMENSIONS);
  if (cleaned.length === 0) {
    throw new Error("Embedding vector is empty.");
  }
  return `[${cleaned.join(",")}]`;
}

export async function embedText(input: string) {
  const response = await createEmbedding(input, EMBEDDING_MODEL);
  const embedding = response?.data?.[0]?.embedding as number[] | undefined;
  if (!embedding) {
    throw new Error("No embedding returned from OpenAI.");
  }
  return {
    embedding,
    model: response?.model || EMBEDDING_MODEL,
    usage: response?.usage as { total_tokens?: number } | undefined,
  };
}

export async function upsertShowEmbedding(showId: string, input: string) {
  const { embedding, model, usage } = await embedText(input);
  const vectorLiteral = toVectorLiteral(embedding);
  await prisma.$executeRawUnsafe(
    `UPDATE "Show"
     SET "embeddingVector" = $1::vector,
         "updatedAt" = now()
     WHERE id = $2`,
    vectorLiteral,
    showId,
  );
  return { model, usage };
}

export async function upsertEpisodeEmbedding(episodeId: string, input: string) {
  const { embedding, model, usage } = await embedText(input);
  const vectorLiteral = toVectorLiteral(embedding);
  await prisma.$executeRawUnsafe(
    `UPDATE "Episode"
     SET "embeddingVector" = $1::vector,
         "updatedAt" = now()
     WHERE id = $2`,
    vectorLiteral,
    episodeId,
  );
  return { model, usage };
}

export async function semanticSearch(query: string, limit: number) {
  const { embedding } = await embedText(query);
  const vectorLiteral = toVectorLiteral(embedding);

  const results = await prisma.$queryRawUnsafe<
    Array<{
      type: "show" | "episode";
      id: string;
      title: string;
      synopsis: string | null;
      slug: string | null;
      seasonNumber: number | null;
      distance: number;
    }>
  >(
    `
    SELECT
      'show' AS type,
      s.id,
      s.title,
      s.synopsis,
      s.slug,
      NULL::INTEGER AS "seasonNumber",
      (s."embeddingVector" <-> $1::vector) AS distance
    FROM "Show" s
    WHERE s."embeddingVector" IS NOT NULL
    UNION ALL
    SELECT
      'episode' AS type,
      e.id,
      e.title,
      e.synopsis,
      NULL::TEXT AS slug,
      sn.number AS "seasonNumber",
      (e."embeddingVector" <-> $1::vector) AS distance
    FROM "Episode" e
    JOIN "Season" sn ON sn.id = e."seasonId"
    WHERE e."embeddingVector" IS NOT NULL
    ORDER BY distance ASC
    LIMIT $2
    `,
    vectorLiteral,
    limit,
  );

  return results;
}
