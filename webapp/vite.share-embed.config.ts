import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": "\"production\"",
  },
  build: {
    outDir: "public/share-embed",
    emptyOutDir: false,
    copyPublicDir: false,
    lib: {
      entry: resolve(__dirname, "src/share/embed.tsx"),
      name: "MalsoriShareEmbed",
      formats: ["iife"],
      fileName: () => "share-embed.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "share-embed.css";
          }
          return "assets/[name][extname]";
        },
      },
    },
  },
});
