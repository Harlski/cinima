import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import { titleShareOgPlugin } from "./vite.titleShareOg";

export default defineConfig({
  plugins: [vue(), titleShareOgPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@cinima/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  server: {
    // Bind all interfaces so Nimiq Pay on a phone can open http://<lan-ip>:5174
    host: true,
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:8787",
      "/health": "http://127.0.0.1:8787",
    },
  },
  preview: {
    host: true,
    port: 5174,
  },
  build: {
    // nimiq-css utilities use native nesting; Pay WebView is modern.
    cssTarget: ["chrome111", "safari16"],
  },
});
