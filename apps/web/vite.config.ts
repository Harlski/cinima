import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import {
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_THEME_COLOR,
} from "@cinima/shared";
import { shareOgPlugin } from "./vite.shareOg";

function siteMetaHtml(origin: string): (html: string) => string {
  const siteOrigin = origin.replace(/\/$/, "");
  return (html) =>
    html
      .replaceAll("__SITE_NAME__", SITE_NAME)
      .replaceAll("__SITE_DESCRIPTION__", SITE_DESCRIPTION)
      .replaceAll("__SITE_THEME_COLOR__", SITE_THEME_COLOR)
      .replaceAll("__SITE_LOCALE__", SITE_LOCALE)
      .replaceAll("__SITE_ORIGIN__", siteOrigin);
}

export default defineConfig(({ mode }) => {
  const siteOrigin =
    process.env.VITE_SITE_ORIGIN ||
    (mode === "production" ? "https://cinima.app" : "http://localhost:5174");
  const apiOrigin =
    process.env.VITE_API_BASE?.replace(/\/$/, "") || "http://127.0.0.1:8787";

  return {
  plugins: [
    vue(),
    shareOgPlugin(apiOrigin),
    {
      name: "cinima-site-meta",
      transformIndexHtml: siteMetaHtml(siteOrigin),
    },
  ],
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
};
});
