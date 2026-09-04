import { describe, expect, it } from "vitest";
import {
  profileShareCopy,
  profileShareDescription,
  profileShareOgImageUrl,
  profileSharePath,
  profileShareUrl,
  shortSharePath,
  shortShareUrl,
  titleShareCopy,
  titleShareOgImageUrl,
  titleSharePath,
  titleShareUrl,
  watchlistShareCopy,
  watchlistShareDescription,
  watchlistShareOgImageUrl,
  watchlistSharePath,
  watchlistShareUrl,
} from "@cinima/shared";
import { titleShareSheetPreview } from "../src/lib/titleShare";

describe("Share link helpers", () => {
  it("groups handle and title as /{handle}/t/{mediaType}/{tmdbId}", () => {
    expect(titleSharePath("Alice", "movie", 550)).toBe("/alice/t/movie/550");
  });

  it("builds invitation copy with the handle and title", () => {
    expect(titleShareCopy("alice", "Fight Club")).toBe(
      "alice wants you to check out Fight Club"
    );
  });

  it("builds an absolute Title Share URL from the web origin", () => {
    expect(titleShareUrl("https://cinima.app", "alice", "movie", 550)).toBe(
      "https://cinima.app/alice/t/movie/550"
    );
  });

  it("builds profile share paths and copy", () => {
    expect(profileSharePath("Alice")).toBe("/alice");
    expect(profileShareUrl("https://cinima.app", "alice")).toBe("https://cinima.app/alice");
    expect(profileShareCopy("alice")).toBe("alice on Cinima");
    expect(profileShareDescription("alice")).toBe(
      "Check out alice's favorite movies & tv shows on Cinima.app"
    );
  });

  it("builds branded Share preview image URLs on the API origin", () => {
    expect(profileShareOgImageUrl("https://cinima.app", "alice")).toBe(
      "https://cinima.app/api/og/profile/alice.png"
    );
    expect(titleShareOgImageUrl("https://cinima.app", "alice", "movie", 550)).toBe(
      "https://cinima.app/api/og/title/alice/movie/550.png"
    );
    expect(watchlistShareOgImageUrl("https://cinima.app", "alice")).toBe(
      "https://cinima.app/api/og/watchlist/alice.png"
    );
  });

  it("builds Watchlist Share path and pick copy", () => {
    expect(watchlistSharePath("Alice")).toBe("/alice/list");
    expect(watchlistShareUrl("https://cinima.app", "alice")).toBe(
      "https://cinima.app/alice/list"
    );
    expect(watchlistShareCopy("alice")).toBe(
      "alice needs a pick - what's next on their Watchlist?"
    );
    expect(watchlistShareDescription("alice")).toBe(
      "Help alice choose what to watch next on Cinima.app"
    );
  });

  it("builds compact short share links", () => {
    expect(shortSharePath("AbC123xy")).toBe("/s/abc123xy");
    expect(shortShareUrl("https://cinima.app", "abc123xy")).toBe("https://cinima.app/s/abc123xy");
  });
});

describe("title share sheet", () => {
  it("uses the Title Share preview PNG URL, not a TMDB poster", () => {
    const preview = titleShareSheetPreview({
      origin: "https://cinima.app",
      handle: "alice",
      titleName: "Fight Club",
      mediaType: "movie",
      tmdbId: 550,
      shareUrl: "https://cinima.app/s/abc123xy",
    });
    expect(preview.imageUrl).toBe(
      "https://cinima.app/api/og/title/alice/movie/550.png"
    );
    expect(preview.headline).toBe("alice wants you to check out Fight Club");
    expect(preview.description).toBe("Fight Club");
    expect(preview.url).toBe("https://cinima.app/s/abc123xy");
  });
});
