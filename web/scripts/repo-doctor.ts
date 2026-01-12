import fs from "fs";
import path from "path";

type Issue = {
  type: string;
  message: string;
  hint?: string;
};

const ROOT = process.cwd();
const WEB_ROOT = path.join(ROOT, "web");

const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

function fileExists(candidate: string) {
  try {
    fs.accessSync(candidate, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function walk(dir: string, files: string[] = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name.startsWith(".")) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (CODE_EXTENSIONS.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function resolveImport(fromPath: string, importPath: string) {
  const base = path.resolve(path.dirname(fromPath), importPath);
  const candidates = [
    base,
    ...CODE_EXTENSIONS.map((ext) => `${base}${ext}`),
    ...CODE_EXTENSIONS.map((ext) => path.join(base, `index${ext}`)),
  ];
  return candidates.find(fileExists);
}

function scanRelativeImports(files: string[]) {
  const issues: Issue[] = [];
  const importRegex = /from\s+["'](\.\.?\/[^"']+)["']/g;
  const requireRegex = /require\(\s*["'](\.\.?\/[^"']+)["']\s*\)/g;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const matches = [...content.matchAll(importRegex), ...content.matchAll(requireRegex)];
    for (const match of matches) {
      const importPath = match[1];
      if (!resolveImport(file, importPath)) {
        issues.push({
          type: "broken-import",
          message: `Missing import target for ${importPath} in ${path.relative(ROOT, file)}`,
          hint: "Check the file path or extension.",
        });
      }
    }
  }

  return issues;
}

function scanMissingRoutes() {
  const issues: Issue[] = [];
  const catalogPath = path.join(WEB_ROOT, "illuvrse_files.json");
  if (!fileExists(catalogPath)) {
    return issues;
  }
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as Array<{
    path: string;
    instruction?: string;
  }>;

  for (const entry of catalog) {
    const target = path.join(WEB_ROOT, "src", "app", entry.path);
    if (!fileExists(target)) {
      issues.push({
        type: "missing-route",
        message: `Missing route file: ${path.relative(ROOT, target)}`,
        hint: entry.instruction,
      });
    }
  }
  return issues;
}

function scanLockFiles() {
  const issues: Issue[] = [];
  const lockTypes = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"];
  for (const lock of lockTypes) {
    const rootLock = path.join(ROOT, lock);
    const webLock = path.join(WEB_ROOT, lock);
    if (fileExists(rootLock) && fileExists(webLock)) {
      issues.push({
        type: "duplicate-lockfile",
        message: `Duplicate ${lock} found in repo root and /web.`,
        hint: "Keep one lockfile per package root.",
      });
    }
  }
  return issues;
}

function scanNextAppRoot() {
  const issues: Issue[] = [];
  const appDir = path.join(WEB_ROOT, "src", "app");
  const pagesDir = path.join(WEB_ROOT, "pages");
  if (!fileExists(appDir) && !fileExists(pagesDir)) {
    issues.push({
      type: "missing-app-root",
      message: "Next.js app root not found under /web/src/app or /web/pages.",
      hint: "Create /web/src/app or /web/pages and move routes there.",
    });
  }
  return issues;
}

function main() {
  const issues: Issue[] = [];
  issues.push(...scanLockFiles());
  issues.push(...scanNextAppRoot());
  issues.push(...scanMissingRoutes());

  const sourceFiles = walk(path.join(WEB_ROOT, "src"));
  issues.push(...scanRelativeImports(sourceFiles));

  if (issues.length === 0) {
    console.log("Repo Doctor: no issues detected.");
    return;
  }

  console.log("Repo Doctor found issues:");
  for (const issue of issues) {
    console.log(`- [${issue.type}] ${issue.message}`);
    if (issue.hint) {
      console.log(`  hint: ${issue.hint}`);
    }
  }
}

main();
