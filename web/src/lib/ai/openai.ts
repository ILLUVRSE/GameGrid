type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionRequest = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" };
};

const OPENAI_BASE_URL = "https://api.openai.com/v1";

export function requireOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  return apiKey;
}

export async function chatCompletion({
  model,
  messages,
  temperature = 0.7,
  maxTokens = 600,
  responseFormat,
}: ChatCompletionRequest) {
  const apiKey = requireOpenAIKey();
  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: responseFormat,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI chat request failed: ${detail}`);
  }

  return response.json();
}

export async function createEmbedding(input: string | string[], model: string) {
  const apiKey = requireOpenAIKey();
  const response = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI embedding request failed: ${detail}`);
  }

  return response.json();
}

export async function moderateText(input: string) {
  const apiKey = requireOpenAIKey();
  const response = await fetch(`${OPENAI_BASE_URL}/moderations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI moderation request failed: ${detail}`);
  }

  return response.json();
}
