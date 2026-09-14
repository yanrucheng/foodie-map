import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { readFileSync } from "node:fs";
import { releaseBuild } from "./scripts/release-build.ts";

/** Read VERSION file — single source of truth for app version. */
const version = readFileSync("VERSION", "utf-8").trim();

export default defineConfig({
  plugins: [react(), releaseBuild()],
  base: "/",
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Let the actual dynamic MobileShell import own its chunk. Shared imports stay shared.
});
