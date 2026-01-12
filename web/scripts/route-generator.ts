import fs from "fs";
import path from "path";
import { chatCompletion } from "../src/lib/ai/openai";

type RouteSpec = {
  path: string;
  prompt: string;
  model?: string;
};

const DEFAULT_MODEL = process.env.OPENAI_MODEL_GENERATOR || "gpt-4o-mini";

function readSpec(specPath: string): RouteSpec[] {
  const content = fs.readFileSync(specPath, "utf8");
  return JSON.parse(content) as RouteSpec[];
}

async function generateFile(spec: RouteSpec) {
  const response = await chatCompletion({
    model: spec.model || DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are generating a single source file. Output only the file contents with no markdown or commentary.",
      },
      {
        role: "user",
        content: `File path: ${spec.path}\nRequirements:\n${spec.prompt}`,
      },
    ],
    temperature: 0.2,
    maxTokens: 1800,
  });

  const content = response?.choices?.[0]?.message?.content || "";
  return content.trimEnd() + "\n";
}

async function writeIfChanged(filePath: string, content: string) {
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf8");
    if (existing === content) {
      return "unchanged";
    }
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  return "written";
}

async function main() {
  const specPath = process.argv[2];
  if (!specPath) {
    console.error("Usage: tsx scripts/route-generator.ts <spec.json>");
    process.exit(1);
  }

  const specs = readSpec(specPath);
  for (const spec of specs) {
    const targetPath = path.resolve(process.cwd(), spec.path);
    const content = await generateFile(spec);
    const status = await writeIfChanged(targetPath, content);
    console.log(`${status}: ${path.relative(process.cwd(), targetPath)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
