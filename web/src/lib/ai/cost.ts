import { prisma } from "@/lib/prisma";

type UsageInfo = {
  total_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
};

const COST_PER_1K_TOKENS_USD: Record<string, number> = {
  "gpt-4.1": 0.01,
  "gpt-4o": 0.005,
  "gpt-4o-mini": 0.001,
  "text-embedding-3-small": 0.00002,
  "text-embedding-3-large": 0.00013,
};

function estimateCost(model: string, tokens?: number) {
  if (!tokens || tokens <= 0) return null;
  const rate = COST_PER_1K_TOKENS_USD[model];
  if (!rate) return null;
  return (tokens / 1000) * rate;
}

export async function logAiUsage(params: {
  route: string;
  model: string;
  usage?: UsageInfo | null;
}) {
  const tokens = params.usage?.total_tokens ?? null;
  const costEstimate = estimateCost(params.model, tokens ?? undefined);
  await prisma.aiUsageLog.create({
    data: {
      route: params.route,
      tokens,
      costEstimate,
    },
  });
}
