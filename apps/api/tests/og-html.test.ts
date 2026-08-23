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
  });
});
