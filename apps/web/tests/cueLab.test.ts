import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_KINDS } from "@cinima/shared";
import {
  cueLabEntryVisible,
  cueLabMarqueeKinds,
  cueLabOverlayIds,
  cueLabProfileHeaderVariant,
  cueLabReturnDigest,
  cueLabSendPreview,
  digestContinueGoesToDiscover,
} from "../src/lib/cueLab";
import {
  cueLabProfileHeaderFixture,
  nextProfileHeaderVariant,
  pickRecommendWash,
  prevProfileHeaderVariant,
  PROFILE_HEADER_VARIANTS,
} from "../src/lib/profileHeaderLab";

describe("Cue lab", () => {
  it("previews a Marquee for every Achievement", () => {
    expect(cueLabMarqueeKinds()).toEqual([
      "opening-night",
      "full-house",
      "word-of-mouth",
      "whats-next",
      "bravo",
      "encore",
      "high-seas",
      "season-ticket",
      "thats-a-wrap",
      "in-the-listings",
      "save-that-for-later",
      "thats-the-one",
      "plus-one",
    ]);
    expect(cueLabMarqueeKinds()).toEqual([...ACHIEVEMENT_KINDS]);
  });

  it("lists overlay previews for cues, Welcome, Guided tour, and product modals", () => {
    expect(cueLabOverlayIds()).toEqual([
      "recommend-cue",
      "return-digest",
      "profile-header-solid",
      "profile-header-fade",
      "profile-header-bleed",
      "profile-header-strip",
      "profile-header-cover",
      "profile-header-banner-bleed",
      "welcome",
      "welcome-back",
      "tour-offer",
      "tour-skip-notice",
      "tour-start",
      "confirm",
      "send-nim",
      "watchlist-leave",
      "pay-only-gate",
      "pay-title",
      "share-sheet",
    ]);
  });

  it("hides the Cue lab entry outside the signed-in shell", () => {
    expect(cueLabEntryVisible({ inAppShell: false })).toBe(false);
  });

  it("shows the Cue lab entry in the signed-in shell during Vite DEV", () => {
    expect(cueLabEntryVisible({ inAppShell: true })).toBe(true);
  });

  it("previews Return digest with eight Identicons and extra Thanks on Me", () => {
    const digest = cueLabReturnDigest();
    expect(digest.thankers).toHaveLength(8);
    expect(digest.thanksCount).toBeGreaterThan(digest.thankers.length);
    expect(digest.nimReceived).toBeGreaterThan(0);
  });

  it("previews Send Custom Message as a title User Send without paying", () => {
    expect(cueLabSendPreview()).toEqual({
      kind: "title",
      toWallet: "NQ01PEERAAAAOVERLAPDEMOWALLET00001",
      handle: "cinephile",
      titleId: "tmdb:movie:550",
    });
  });

  it("keeps Return digest Continue on Cue lab and Discover", () => {
    expect(digestContinueGoesToDiscover("cue-lab")).toBe(false);
    expect(digestContinueGoesToDiscover("discover")).toBe(false);
    expect(digestContinueGoesToDiscover("me")).toBe(true);
    expect(digestContinueGoesToDiscover("title")).toBe(true);
  });

  it("maps Profile header Cue lab buttons onto layouts", () => {
    expect(PROFILE_HEADER_VARIANTS.map((row) => row.id)).toEqual([
      "solid",
      "fade",
      "bleed",
      "strip",
      "cover",
      "banner-bleed",
    ]);
    expect(cueLabProfileHeaderVariant("profile-header-fade")).toBe("fade");
    expect(cueLabProfileHeaderVariant("profile-header-banner-bleed")).toBe(
      "banner-bleed"
    );
    expect(cueLabProfileHeaderVariant("recommend-cue")).toBe(null);
    expect(nextProfileHeaderVariant("banner-bleed")).toBe("solid");
    expect(prevProfileHeaderVariant("solid")).toBe("banner-bleed");
  });

  it("previews a fixture Handle with Recommends and Favorite-only titles", () => {
    const fixture = cueLabProfileHeaderFixture();
    expect(fixture.handle).toBe("cinephile");
    expect(fixture.recommends).toHaveLength(10);
    expect(fixture.favorites.length).toBeGreaterThan(fixture.recommends.length);
  });

  it("picks a shuffled movie-and-TV mix from Recommends for the banner", () => {
    const fixture = cueLabProfileHeaderFixture();
    const firstFour = fixture.recommends.slice(0, 4).map((t) => t.id);
    const wash = pickRecommendWash(fixture.recommends, 4, () => 0.99);
    expect(wash).toHaveLength(4);
    expect(new Set(wash.map((t) => t.id)).size).toBe(4);
    expect(wash.every((t) => t.posterUrl)).toBe(true);
    expect(wash.every((t) => fixture.recommends.some((r) => r.id === t.id))).toBe(
      true
    );
    expect(new Set(wash.map((t) => t.mediaType))).toEqual(
      new Set(["movie", "tv"])
    );
    expect(wash.map((t) => t.id)).not.toEqual(firstFour);
  });
});
