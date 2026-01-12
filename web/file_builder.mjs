import fs from "fs";
import path from "path";
import OpenAI from "openai";

/**
 * CONFIG
 */
const MODEL = "gpt-4.1";
const MAX_OUTPUT_TOKENS = 16000;
const ROOT = process.cwd();

const FILE_MANIFEST_PATH = path.join(ROOT, "illuvrse_files.json");
const STATE_PATH = path.join(ROOT, ".illuvrse.manifest.json");

/**
 * OPENAI CLIENT
 */
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * HELPERS
 */
function loadJSON(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeFileSafe(relativePath, contents) {
  const fullPath = path.join(ROOT, relativePath);
  ensureDir(fullPath);
  fs.writeFileSync(fullPath, contents);
  console.log("WROTE", relativePath);
}

/**
 * AI FILE GENERATION
 */
async function generateFile(pathName, instruction) {
  const prompt = `
You are a senior production-grade Next.js engineer.

PROJECT:
ILLUVRSE — a Paramount+/Netflix-style streaming platform.

TASK:
Generate the FULL contents of the file below.

FILE PATH:
${pathName}

INSTRUCTIONS:
${instruction}

STRICT RULES:
- Output ONLY raw file contents
- NO markdown
- NO code fences
- NO explanations
- Valid TypeScript / TSX where applicable
- Assume modern Next.js App Router
`;

  const response = await client.responses.create({
    model: MODEL,
    input: prompt,
    max_output_tokens: MAX_OUTPUT_TOKENS,
  });

  return response.output_text;
}

/**
 * MAIN
 */
async function main() {
  console.log("🔥 ILLUVRSE FILE BUILDER — GPT-4.1 ACTIVE");

  // Load state
  const state = loadJSON(STATE_PATH, { generated: [] });

  // Load planned files
  if (!fs.existsSync(FILE_MANIFEST_PATH)) {
    console.error("❌ Missing illuvrse_files.json");
    process.exit(1);
  }

  const files = loadJSON(FILE_MANIFEST_PATH, []);

  // Find next file to generate
  const next = files.find(f => !state.generated.includes(f.path));

  if (!next) {
    console.log("✅ ALL FILES FROM MANIFEST HAVE BEEN GENERATED");
    return;
  }

  console.log("➡️ Generating:", next.path);

  // Generate via AI
  const contents = await generateFile(next.path, next.instruction);

  // Write file
  writeFileSafe(next.path, contents);

  // Update state
  state.generated.push(next.path);
  saveJSON(STATE_PATH, state);

  console.log("✅ DONE — NEXT FILE QUEUED FOR NEXT RUN");
}

/**
 * EXECUTE
 */
main().catch(err => {
  console.error("❌ BUILDER FAILED:", err);
  process.exit(1);
});

