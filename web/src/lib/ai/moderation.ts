import { moderateText } from "@/lib/ai/openai";

type ModerationResult = {
  flagged: boolean;
  categories?: Record<string, boolean>;
};

export async function runSafetyCheck(text: string) {
  const response = await moderateText(text);
  const result = response?.results?.[0] as ModerationResult | undefined;
  if (!result) {
    return { flagged: false, categories: {} };
  }

  return {
    flagged: Boolean(result.flagged),
    categories: result.categories || {},
  };
}
