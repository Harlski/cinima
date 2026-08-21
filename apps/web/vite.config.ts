import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@nimcharts/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
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
});
