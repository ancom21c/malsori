#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const webappRoot = resolve(dirname(scriptPath), "..");
const distAssetsDir = join(webappRoot, "dist", "assets");
const shareEmbedFile = join(webappRoot, "public", "share-embed", "share-embed.js");

const BUDGET = {
  totalJsBytes: 1_406_000,
  maxJsChunkBytes: 368_000,
  maxCssChunkBytes: 50_000,
  mainEntryJsBytes: 115_000,
  shareEmbedBytes: 700_000,
};

const KB = 1024;

function resolveFlag(value, defaultValue) {
  if (!value) {
    return defaultValue;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

const EXCLUDED_JS_CHUNK_PATTERNS = [
  !resolveFlag(process.env.VITE_FEATURE_REALTIME_TRANSLATE, false)
    ? /^TranslatePage-.*\.js$/
    : null,
  !resolveFlag(process.env.VITE_FEATURE_SESSION_ARTIFACTS, false)
    ? /^sessionWorkspaceModel-.*\.js$/
    : null,
  !resolveFlag(process.env.VITE_FEATURE_SESSION_ARTIFACTS, false)
    ? /^backendBindingRuntime-.*\.js$/
    : null,
  !resolveFlag(process.env.VITE_FEATURE_OPERATOR_BACKEND_BINDINGS, false)
    ? /^BackendBindingOperatorPanel-.*\.js$/
    : null,
].filter(Boolean);

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
  const excludedJsAssets = jsAssets.filter((entry) =>
    EXCLUDED_JS_CHUNK_PATTERNS.some((pattern) => pattern.test(entry.name))
  );
  const includedJsAssets = jsAssets.filter(
    (entry) => !excludedJsAssets.some((excluded) => excluded.name === entry.name)
  );
  const cssAssets = entries.filter((entry) => entry.name.endsWith(".css"));
  const mainEntry = includedJsAssets.find((entry) => /^main-.*\.js$/.test(entry.name));
  const totalJs = includedJsAssets.reduce((sum, entry) => sum + entry.size, 0);
  const shareEmbedSize = statSync(shareEmbedFile).size;
  const jsAssetNames = new Set(includedJsAssets.map((entry) => entry.name));
  const importGraph = new Map(
    includedJsAssets.map((entry) => {
      const content = readFileSync(entry.filePath, "utf8");
      const imports = [];
      const importPattern = /from\s*["']\.\/([^"']+\.js)["']/g;
      let match;
      while ((match = importPattern.exec(content)) !== null) {
        const imported = match[1];
        if (jsAssetNames.has(imported)) {
          imports.push(imported);
        }
      }
      return [entry.name, imports];
    })
  );

  return {
    entries,
    jsAssets: includedJsAssets,
    excludedJsAssets,
    cssAssets,
    mainEntry,
    totalJs,
    shareEmbedSize,
    importGraph,
  };
}

function findCycles(graph) {
  const state = new Map();
  const stack = [];
  const stackIndex = new Map();
  const cycles = [];
  const dedupe = new Set();

  const visit = (node) => {
    state.set(node, 1);
    stackIndex.set(node, stack.length);
    stack.push(node);

    for (const next of graph.get(node) ?? []) {
      const nextState = state.get(next) ?? 0;
      if (nextState === 0) {
        visit(next);
        continue;
      }
      if (nextState !== 1) {
        continue;
      }
      const cycleStart = stackIndex.get(next);
      if (cycleStart === undefined) {
        continue;
      }
      const cycle = stack.slice(cycleStart).concat(next);
      const key = cycle.join(" -> ");
      if (!dedupe.has(key)) {
        dedupe.add(key);
        cycles.push(cycle);
      }
    }

    stack.pop();
    stackIndex.delete(node);
    state.set(node, 2);
  };

  for (const node of graph.keys()) {
    if ((state.get(node) ?? 0) === 0) {
      visit(node);
    }
  }

  return cycles;
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
  if (stats.excludedJsAssets.length > 0) {
    console.log(
      `- excluded disabled-feature chunks: ${stats.excludedJsAssets
        .map((entry) => `${basename(entry.name)} (${formatKiB(entry.size)})`)
        .join(", ")}`
    );
  }
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
  const cycles = findCycles(stats.importGraph);

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

  if (cycles.length > 0) {
    const cycleSamples = cycles.slice(0, 3).map((cycle) => cycle.join(" -> "));
    for (const cycle of cycleSamples) {
      violations.push(`Chunk import cycle detected: ${cycle}`);
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
