import fs from "fs";
import path from "path";
import { chatCompletion } from "../src/lib/ai/openai";

const TEST_MODEL = process.env.OPENAI_MODEL_TESTS || "gpt-4o-mini";
const OUTPUT_DIR = path.join(process.cwd(), "tests");

type TestSpec = {
  file: string;
  prompt: string;
};

const SPECS: TestSpec[] = [
  {
    file: "ai-smoke.spec.ts",
    prompt:
      "Generate a Playwright test that opens the homepage, verifies the hero text is visible, navigates to /search, and checks the search form exists.",
  },
  {
    file: "api-smoke.spec.ts",
    prompt:
      "Generate a Playwright test that calls /api/search?q=ILLUVRSE and expects a 200 with results array.",
  },
];

async function generateTest(spec: TestSpec) {
  const response = await chatCompletion({
    model: TEST_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are generating a single TypeScript test file. Output only the file contents with no markdown or commentary.",
      },
      { role: "user", content: spec.prompt },
    ],
    temperature: 0.2,
    maxTokens: 800,
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
  for (const spec of SPECS) {
    const content = await generateTest(spec);
    const targetPath = path.join(OUTPUT_DIR, spec.file);
    const status = await writeIfChanged(targetPath, content);
    console.log(`${status}: ${path.relative(process.cwd(), targetPath)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
