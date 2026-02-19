#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const webappRoot = resolve(dirname(scriptPath), "..");
const sourceRoot = join(webappRoot, "src");
const translationsPath = join(sourceRoot, "i18n", "translations.ts");

const KEY_DEFINITION_REGEX = /^\s{2}([A-Za-z0-9_]+):\s*\{/gm;
const KEY_USAGE_REGEXES = [
  /\bt\(\s*["'`]([^"'`]+)["'`]/g,
  /\btStatic\(\s*["'`]([^"'`]+)["'`]/g,
];

function walkFiles(dirPath) {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const ext = extname(entry.name);
    if (ext === ".ts" || ext === ".tsx") {
      files.push(fullPath);
    }
  }
  return files;
}

function readDefinedKeys() {
  const source = readFileSync(translationsPath, "utf8");
  const keys = new Set();
  for (const match of source.matchAll(KEY_DEFINITION_REGEX)) {
    keys.add(match[1]);
  }
  return keys;
}

function collectUsedKeys(files) {
  const used = new Set();
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const regex of KEY_USAGE_REGEXES) {
      regex.lastIndex = 0;
      let match = regex.exec(source);
      while (match) {
        used.add(match[1]);
        match = regex.exec(source);
      }
    }
  }
  return used;
}

function main() {
  if (!statSync(translationsPath).isFile()) {
    console.error(`[i18n check] translations file not found: ${translationsPath}`);
    process.exit(1);
  }

  const defined = readDefinedKeys();
  const files = walkFiles(sourceRoot);
  const used = collectUsedKeys(files);
  const missing = [...used].filter((key) => !defined.has(key)).sort();

  if (missing.length > 0) {
    console.error("[i18n check] missing translation keys:");
    for (const key of missing) {
      console.error(`- ${key}`);
    }
    process.exit(1);
  }

  console.log(`[i18n check] PASS (${used.size} referenced keys, ${defined.size} defined keys)`);
}

main();
