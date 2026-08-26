import { describe, expect, it } from "vitest";
import { socialOgHtml } from "../src/lib/ogHtml.js";

describe("socialOgHtml", () => {
  it("includes favicon, description, and indexing metadata", () => {
    const html = socialOgHtml({
      pageTitle: "alice on Cinima",
      description: "2 Recommends on Cinima",
      url: "https://cinima.app/alice",
    });

    expect(html).toContain('name="description" content="2 Recommends on Cinima"');
    expect(html).toContain('name="robots" content="index, follow"');
    expect(html).toContain('rel="icon" href="https://cinima.app/favicon.svg"');
    expect(html).toContain('property="og:locale" content="en_US"');
    expect(html).toContain('name="theme-color" content="#1c1f33"');
    expect(html).not.toContain('id="app"');
  });

  it("includes og:image and large twitter card when a poster is provided", () => {
    const html = socialOgHtml({
      pageTitle: "alice wants you to check out Fight Club",
      description: "alice wants you to check out Fight Club",
      url: "https://cinima.app/alice/t/movie/550",
      imageUrl: "https://image.tmdb.org/t/p/w780/poster.jpg",
    });

    expect(html).toContain(
      'property="og:image" content="https://image.tmdb.org/t/p/w780/poster.jpg"'
    );
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).not.toContain('id="app"');
    expect(html).not.toContain('property="og:title" content="Cinima"');
  });
});
