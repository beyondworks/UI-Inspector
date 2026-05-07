import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => ({
  plugins: [
    react({
      ...(command === "serve"
        ? {
            babel: {
              plugins: ["./src/inspector/babel-plugin-source-loc.mjs"],
            },
          }
        : {}),
    }),
    tailwindcss(),
  ],
  server: {
    hmr: true,
  },
  define: {
    __GEMINI_INSPECTOR__: JSON.stringify(true),
  },
}));
