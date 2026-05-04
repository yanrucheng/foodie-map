import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { readFileSync } from "node:fs";

/** Read VERSION file — single source of truth for app version. */
const version = readFileSync("VERSION", "utf-8").trim();

export default defineConfig({
  plugins: [react()],
  base: "/",
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          /** Keep mobile-specific components in a separate chunk. */
          mobile: [
            "./src/components/MobileShell.tsx",
            "./src/components/BottomSheet.tsx",
            "./src/components/MobilePopupCard.tsx",
          ],
        },
      },
    },
  },
});
