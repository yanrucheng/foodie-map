import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  base: "/",
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
