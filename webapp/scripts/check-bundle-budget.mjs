#!/usr/bin/env node

import { readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const webappRoot = resolve(dirname(scriptPath), "..");
const distAssetsDir = join(webappRoot, "dist", "assets");
const shareEmbedFile = join(webappRoot, "public", "share-embed", "share-embed.js");

const BUDGET = {
  totalJsBytes: 1_250_000,
  maxJsChunkBytes: 300_000,
  maxCssChunkBytes: 50_000,
  mainEntryJsBytes: 90_000,
  shareEmbedBytes: 700_000,
};

const KB = 1024;

function formatKiB(bytes) {
  return `${(bytes / KB).toFixed(2)} KiB`;
}

function readAssetStats() {
  const entries = readdirSync(distAssetsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const filePath = join(distAssetsDir, entry.name);
      const size = statSync(filePath).size;
      return { name: entry.name, size, filePath };
    });

  const jsAssets = entries.filter((entry) => entry.name.endsWith(".js"));
  const cssAssets = entries.filter((entry) => entry.name.endsWith(".css"));
  const mainEntry = jsAssets.find((entry) => /^main-.*\.js$/.test(entry.name));
  const totalJs = jsAssets.reduce((sum, entry) => sum + entry.size, 0);
  const shareEmbedSize = statSync(shareEmbedFile).size;

  return {
    entries,
    jsAssets,
    cssAssets,
    mainEntry,
    totalJs,
    shareEmbedSize,
  };
}

function fail(message, details = []) {
  console.error(`\n[Bundle Budget] FAIL: ${message}`);
  for (const detail of details) {
    console.error(`- ${detail}`);
  }
}

function printSummary(stats) {
  console.log("[Bundle Budget] summary");
  console.log(`- total JS (dist/assets): ${formatKiB(stats.totalJs)} / ${formatKiB(BUDGET.totalJsBytes)}`);
  console.log(`- share-embed.js: ${formatKiB(stats.shareEmbedSize)} / ${formatKiB(BUDGET.shareEmbedBytes)}`);
  if (stats.mainEntry) {
    console.log(
      `- ${stats.mainEntry.name}: ${formatKiB(stats.mainEntry.size)} / ${formatKiB(BUDGET.mainEntryJsBytes)}`
    );
  } else {
    console.log("- main entry chunk: not found");
  }
}

try {
  const stats = readAssetStats();
  const violations = [];

  if (stats.totalJs > BUDGET.totalJsBytes) {
    violations.push(
      `Total JS exceeded: ${formatKiB(stats.totalJs)} > ${formatKiB(BUDGET.totalJsBytes)}`
    );
  }

  if (!stats.mainEntry) {
    violations.push("Main entry chunk (main-*.js) not found in dist/assets.");
  } else if (stats.mainEntry.size > BUDGET.mainEntryJsBytes) {
    violations.push(
      `Main entry exceeded: ${stats.mainEntry.name} ${formatKiB(stats.mainEntry.size)} > ${formatKiB(
        BUDGET.mainEntryJsBytes
      )}`
    );
  }

  if (stats.shareEmbedSize > BUDGET.shareEmbedBytes) {
    violations.push(
      `share-embed.js exceeded: ${formatKiB(stats.shareEmbedSize)} > ${formatKiB(BUDGET.shareEmbedBytes)}`
    );
  }

  for (const jsAsset of stats.jsAssets) {
    if (jsAsset.size > BUDGET.maxJsChunkBytes) {
      violations.push(
        `JS chunk exceeded: ${jsAsset.name} ${formatKiB(jsAsset.size)} > ${formatKiB(BUDGET.maxJsChunkBytes)}`
      );
    }
  }

  for (const cssAsset of stats.cssAssets) {
    if (cssAsset.size > BUDGET.maxCssChunkBytes) {
      violations.push(
        `CSS chunk exceeded: ${cssAsset.name} ${formatKiB(cssAsset.size)} > ${formatKiB(BUDGET.maxCssChunkBytes)}`
      );
    }
  }

  printSummary(stats);

  if (violations.length > 0) {
    fail("One or more thresholds were exceeded.", violations);
    console.error("\nAction guide:");
    console.error("- Split route-level code with lazy imports.");
    console.error("- Move rarely used heavy dependencies behind conditional imports.");
    console.error("- Audit icon imports and replace broad imports with exact icon paths.");
    process.exit(1);
  }

  const largestJs = [...stats.jsAssets]
    .sort((a, b) => b.size - a.size)
    .slice(0, 5)
    .map((entry) => `${basename(entry.name)} (${formatKiB(entry.size)})`);
  console.log("- top JS chunks:");
  for (const item of largestJs) {
    console.log(`  - ${item}`);
  }

  console.log("\n[Bundle Budget] PASS");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(
    "Unable to evaluate bundle outputs. Run `npm run build` first and ensure dist artifacts exist.",
    [message]
  );
  process.exit(1);
}
