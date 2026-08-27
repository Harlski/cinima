import { describe, expect, it, vi } from "vitest";
import {
  isShareOgCrawler,
  parseShareOgPath,
  shareOgApiPath,
  SHORT_SHARE_PATH,
  TITLE_SHARE_PATH,
} from "../src/lib/shareOgCrawler";
import {
  handleShareOgRequest,
  resolveShareOgApiBase,
} from "../src/lib/shareOgEdge";

describe("Share OG crawler detection", () => {
  it("treats major social crawlers as crawlers", () => {
    expect(isShareOgCrawler("facebookexternalhit/1.1")).toBe(true);
    expect(isShareOgCrawler("Facebot")).toBe(true);
    expect(isShareOgCrawler("FacebookBot")).toBe(true);
    expect(
      isShareOgCrawler(
        "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)"
      )
    ).toBe(true);
    expect(isShareOgCrawler("Twitterbot/1.0")).toBe(true);
    expect(isShareOgCrawler("WhatsApp/2.0")).toBe(true);
    expect(isShareOgCrawler("TelegramBot")).toBe(true);
    expect(isShareOgCrawler("Discordbot")).toBe(true);
    expect(isShareOgCrawler("Slackbot-LinkExpanding 1.0")).toBe(true);
  });

  it("does not treat a normal browser as a crawler", () => {
    expect(
      isShareOgCrawler(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0.0.0"
      )
    ).toBe(false);
  });

  it("matches share paths", () => {
    expect(SHORT_SHARE_PATH.test("/s/abc12345")).toBe(true);
    expect(TITLE_SHARE_PATH.test("/alice/t/movie/550")).toBe(true);
    expect(TITLE_SHARE_PATH.test("/alice")).toBe(false);
  });

  it("parses profile, title, and short share paths", () => {
    expect(parseShareOgPath("/s/abc12345")).toEqual({
      type: "short",
      code: "abc12345",
    });
    expect(parseShareOgPath("/alice/t/movie/550")).toEqual({
      type: "title",
      handle: "alice",
      mediaType: "movie",
      tmdbId: "550",
    });
    expect(parseShareOgPath("/alice")).toEqual({
      type: "profile",
      handle: "alice",
    });
    expect(parseShareOgPath("/discover")).toBeNull();
    expect(parseShareOgPath("/alice/t/show/550")).toBeNull();
  });

  it("maps share targets to API paths", () => {
    expect(shareOgApiPath({ type: "short", code: "abc12345" })).toBe(
      "/api/s/abc12345"
    );
    expect(
      shareOgApiPath({
        type: "title",
        handle: "alice",
        mediaType: "movie",
        tmdbId: "550",
      })
    ).toBe("/api/public/alice/t/movie/550");
    expect(shareOgApiPath({ type: "profile", handle: "alice" })).toBe(
      "/api/public/alice"
    );
  });
});

describe("handleShareOgRequest", () => {
  const previewHtml = `<!doctype html><html><head>
<meta property="og:title" content="alice wants you to check out Fight Club" />
<meta property="og:image" content="https://image.tmdb.org/t/p/w780/poster.jpg" />
</head><body><p>preview</p></body></html>`;

  const spaHtml = `<!doctype html><html><head>
<meta property="og:title" content="Cinima" />
</head><body><div id="app"></div></body></html>`;

  it("returns Share preview HTML for a crawler on a Title Share path", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(
        "https://api.cinima.app/api/public/alice/t/movie/550"
      );
      expect(init?.headers).toEqual({ Accept: "text/html" });
      return new Response(previewHtml, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    });

    const res = await handleShareOgRequest(
      new Request("https://www.cinima.app/alice/t/movie/550", {
        headers: { "user-agent": "Twitterbot/1.0" },
      }),
      { apiBase: "https://api.cinima.app", fetchImpl }
    );

    expect(res).not.toBeNull();
    expect(res!.status).toBe(200);
    const body = await res!.text();
    expect(body).toContain('property="og:title" content="alice wants you to check out Fight Club"');
    expect(body).toContain("og:image");
    expect(body).not.toContain('id="app"');
    expect(body).not.toContain(spaHtml);
  });

  it("falls through for a normal browser", async () => {
    const fetchImpl = vi.fn();
    const res = await handleShareOgRequest(
      new Request("https://www.cinima.app/alice/t/movie/550", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0.0.0",
        },
      }),
      { apiBase: "https://api.cinima.app", fetchImpl }
    );
    expect(res).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("falls through when upstream fetch fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network");
    });
    const res = await handleShareOgRequest(
      new Request("https://www.cinima.app/alice/t/movie/550", {
        headers: { "user-agent": "WhatsApp/2.0" },
      }),
      { apiBase: "https://api.example.test", fetchImpl }
    );
    expect(res).toBeNull();
  });

  it("resolves API base from env with default", () => {
    expect(resolveShareOgApiBase({})).toBe("https://api.cinima.app");
    expect(resolveShareOgApiBase({ API_ORIGIN: "https://api.example/" })).toBe(
      "https://api.example"
    );
    expect(
      resolveShareOgApiBase({ VITE_API_BASE: "https://vite-api.example" })
    ).toBe("https://vite-api.example");
  });
});
