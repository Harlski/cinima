import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_THEME_COLOR,
} from "@cinima/shared";

function applySiteMeta(html: string, origin: string): string {
  const siteOrigin = origin.replace(/\/$/, "");
  return html
    .replaceAll("__SITE_NAME__", SITE_NAME)
    .replaceAll("__SITE_DESCRIPTION__", SITE_DESCRIPTION)
    .replaceAll("__SITE_THEME_COLOR__", SITE_THEME_COLOR)
    .replaceAll("__SITE_LOCALE__", SITE_LOCALE)
    .replaceAll("__SITE_ORIGIN__", siteOrigin);
}

describe("index.html site metadata", () => {
  it("includes favicon, description, and Open Graph tags", () => {
    const raw = readFileSync(path.resolve(__dirname, "../index.html"), "utf8");
    const html = applySiteMeta(raw, "https://cinima.app");

    expect(html).toContain('rel="icon" href="/favicon.svg"');
    expect(html).toContain(`<meta name="description" content="${SITE_DESCRIPTION}" />`);
    expect(html).toContain('name="robots" content="index, follow"');
    expect(html).toContain('<link rel="canonical" href="https://cinima.app/" />');
    expect(html).toContain(`property="og:title" content="${SITE_NAME}"`);
    expect(html).toContain(`property="og:locale" content="${SITE_LOCALE}"`);
    expect(html).toContain(`name="theme-color" content="${SITE_THEME_COLOR}"`);
    expect(html).toContain('rel="manifest" href="/site.webmanifest"');
  });
});
