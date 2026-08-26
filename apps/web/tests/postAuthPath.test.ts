import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  isSafePostAuthPath,
  stashPostAuthPath,
  takePostAuthPath,
} from "../src/lib/postAuthPath";
import { titleAppPath } from "../src/lib/payLinks";

describe("post-auth path stash", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value);
        },
        removeItem: (key: string) => {
          memory.delete(key);
        },
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "sessionStorage");
  });

  it("allows title deep links and rejects arbitrary paths", () => {
    expect(isSafePostAuthPath("/title/movie/550")).toBe(true);
    expect(isSafePostAuthPath("/title/tmdb%3Amovie%3A550")).toBe(true);
    expect(isSafePostAuthPath("/discover")).toBe(true);
    expect(isSafePostAuthPath("/s/abc")).toBe(false);
    expect(isSafePostAuthPath("https://evil.test")).toBe(false);
  });

  it("stashes and consumes a path once", () => {
    stashPostAuthPath("/title/movie/550");
    expect(takePostAuthPath()).toBe("/title/movie/550");
    expect(takePostAuthPath()).toBeNull();
  });
});

describe("title app path", () => {
  it("uses colon-free paths for Pay deep links", () => {
    expect(titleAppPath("tmdb:movie:550")).toBe("/title/movie/550");
    expect(titleAppPath("tmdb:tv:1396")).toBe("/title/tv/1396");
    expect(titleAppPath("movie:550")).toBe("/title/movie/550");
  });
});
