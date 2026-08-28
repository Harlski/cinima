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
} from "@cinima/shared";

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
    expect(profileShareOgImageUrl("https://www.cinima.app", "alice")).toBe(
      "https://www.cinima.app/api/og/profile/alice.png"
    );
    expect(titleShareOgImageUrl("https://www.cinima.app", "alice", "movie", 550)).toBe(
      "https://www.cinima.app/api/og/title/alice/movie/550.png"
    );
  });

  it("builds compact short share links", () => {
    expect(shortSharePath("AbC123xy")).toBe("/s/abc123xy");
    expect(shortShareUrl("https://cinima.app", "abc123xy")).toBe("https://cinima.app/s/abc123xy");
  });
});
