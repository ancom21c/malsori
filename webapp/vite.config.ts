import { execSync } from "node:child_process";
import { resolve } from "path";
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

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUILD_HASH__: JSON.stringify(buildHash),
  },
  plugins: [react()],
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
