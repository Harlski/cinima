import { describe, expect, it } from "vitest";
import { watchlistShareSheetPreview } from "../src/lib/watchlistShare";

describe("watchlist share sheet", () => {
  it("uses the Watchlist Share preview PNG URL, not a TMDB poster", () => {
    const preview = watchlistShareSheetPreview({
      origin: "https://cinima.app",
      handle: "alice",
      shareUrl: "https://cinima.app/s/abc123xy",
    });
    expect(preview.imageUrl).toBe("https://cinima.app/api/og/watchlist/alice.png");
    expect(preview.headline).toBe(
      "alice needs a pick - what's next on their Watchlist?"
    );
    expect(preview.description).toBe(
      "Help alice choose what to watch next on Cinima.app"
    );
    expect(preview.url).toBe("https://cinima.app/s/abc123xy");
  });
});
