import fs from "fs";
import path from "path";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = "gpt-4.1";
const MAX_OUTPUT_TOKENS = 16000;
const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, ".illuvrse.manifest.json");

function loadManifest() {
  if (!fs.existsSync(MANIFEST)) return { generated: [] };
  return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
}

function writeFileSafe(filePath, content) {
  const fullPath = path.join(ROOT, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  console.log("WROTE", filePath);
}

async function generateFile(filePath, instruction) {
  const prompt = `
You are a senior software engineer.

Generate ONLY the contents of this file.

FILE PATH:
${filePath}

INSTRUCTIONS:
${instruction}

RULES:
- Output ONLY raw file contents
- No explanations
- No markdown
- No code fences
`;

  const res = await client.responses.create({
    model: MODEL,
    input: prompt,
    max_output_tokens: MAX_OUTPUT_TOKENS,
  });

  writeFileSafe(filePath, res.output_text);
}

async function main() {
  console.log("🔥 ILLUVRSE STATEFUL BUILDER RUNNING — CREDITS BURNING");

  const manifest = loadManifest();

  const plannedFiles = [
    // CORE UI
    ["web/src/app/search/page.tsx", "Create a search page for shows and episodes."],
    ["web/src/app/profile/page.tsx", "Create a user profile management page."],
    ["web/src/components/Header.tsx", "Create the main app header with navigation."],
    ["web/src/components/Footer.tsx", "Create a footer for ILLUVRSE."],

    // AUTH UI
    ["web/src/app/login/page.tsx", "Create a login page."],
    ["web/src/app/register/page.tsx", "Create a registration page."],

    // ADMIN
    ["web/src/app/admin/page.tsx", "Create an admin dashboard homepage."],
    ["web/src/app/admin/shows/page.tsx", "Admin CRUD page for shows."],

    // BACKEND
    ["api/admin.ts", "Admin APIs for managing shows, seasons, episodes."],
    ["api/search.ts", "Search API for shows and episodes."],

    // DATA / SEED
    ["prisma/seed.ts", "Seed database with sample ILLUVRSE content."],
  ];

  const next = plannedFiles.find(
    ([file]) => !manifest.generated.includes(file)
  );

  if (!next) {
    console.log("✅ ALL PLANNED FILES GENERATED.");
    return;
  }

  const [file, instruction] = next;

  await generateFile(file, instruction);

  manifest.generated.push(file);
  saveManifest(manifest);

  console.log("➡️ NEXT FILE QUEUED FOR NEXT RUN");
}

main();

