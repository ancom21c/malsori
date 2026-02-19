import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "path";
import type { Plugin, ResolvedConfig } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const buildHash =
  process.env.BUILD_HASH ??
  process.env.VITE_BUILD_HASH ??
  (() => {
    try {
      return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
    } catch {
      return Date.now().toString(36);
    }
  })();

function assetVersioningPlugin(hash: string): Plugin {
  const versionParam = `v=${hash}`;
  let resolvedConfig: ResolvedConfig | null = null;

  const withVersion = (url: string) => {
    if (url.includes(`?${versionParam}`) || url.includes(`&${versionParam}`)) {
      return url;
    }
    return url.includes("?") ? `${url}&${versionParam}` : `${url}?${versionParam}`;
  };

  const applyVersionToManifest = (manifestPath: string) => {
    if (!existsSync(manifestPath)) {
      return;
    }
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    } catch {
      return;
    }
    if (!manifest || !Array.isArray(manifest.icons)) {
      return;
    }
    manifest.icons = manifest.icons.map((icon: { src?: string }) => {
      if (!icon?.src) {
        return icon;
      }
      return { ...icon, src: withVersion(icon.src) };
    });
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  };

  return {
    name: "malsori-asset-versioning",
    configResolved(config) {
      resolvedConfig = config;
    },
    transformIndexHtml(html) {
      return html
        .replaceAll("/malsori-favicon.svg", withVersion("/malsori-favicon.svg"))
        .replaceAll("/manifest.webmanifest", withVersion("/manifest.webmanifest"));
    },
    closeBundle() {
      if (!resolvedConfig) {
        return;
      }
      const manifestPath = join(resolvedConfig.build.outDir, "manifest.webmanifest");
      applyVersionToManifest(manifestPath);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUILD_HASH__: JSON.stringify(buildHash),
  },
  plugins: [react(), assetVersioningPlugin(buildHash)],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        share: resolve(__dirname, "share.html"),
        "service-worker": resolve(__dirname, "src/service-worker.js"),
      },
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === "service-worker" ? "service-worker.js" : "assets/[name]-[hash].js",
      },
    },
  },
})
