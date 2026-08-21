import { describe, expect, it } from "vitest";
import {
  facebookShareUrl,
  titleShareCopy,
  titleSharePath,
  titleShareUrl,
  xShareUrl,
} from "@cinima/shared";

describe("Title Share link helpers", () => {
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

  it("builds X and Facebook share intents for the Title Share URL", () => {
    const url = "https://cinima.app/alice/t/movie/550";
    const text = "alice wants you to check out Fight Club";
    expect(xShareUrl(url, text)).toBe(
      "https://x.com/intent/tweet?text=alice%20wants%20you%20to%20check%20out%20Fight%20Club&url=https%3A%2F%2Fcinima.app%2Falice%2Ft%2Fmovie%2F550"
    );
    expect(facebookShareUrl(url, text)).toBe(
      "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fcinima.app%2Falice%2Ft%2Fmovie%2F550&quote=alice%20wants%20you%20to%20check%20out%20Fight%20Club"
    );
  });
});
