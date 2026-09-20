import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FOR_YOU_SLOT_ATTR } from "../src/lib/forYouPass";
import {
  recommendCueDelayMs,
  shouldPlayTitleFlight,
  TITLE_FLIGHT_HINT_AT_MS,
  TITLE_FLIGHT_MS,
  TITLE_FLIGHT_ORIGIN_ATTR,
  TITLE_FLIGHT_POSTER_ATTR,
  TITLE_FLIGHT_RECOMMEND_STAGE_MS,
  titleFlightHintAtMs,
  titleFlightOriginFromForYouSet,
  titleFlightPosterFrom,
  titleFlightSettleMs,
  titleFlightTab,
} from "../src/lib/titleFlight";

describe("Title flight", () => {
  it("plays after a Watchlist add, Favorite, or Recommend in the signed-in app", () => {
    expect(
      shouldPlayTitleFlight({
        tourActive: false,
        onboarding: false,
        reduceMotion: false,
      })
    ).toBe(true);
  });

  it("skips during Favorites onboarding and the Guided tour", () => {
    expect(
      shouldPlayTitleFlight({
        tourActive: true,
        onboarding: false,
        reduceMotion: false,
      })
    ).toBe(false);
    expect(
      shouldPlayTitleFlight({
        tourActive: false,
        onboarding: true,
        reduceMotion: false,
      })
    ).toBe(false);
  });

  it("skips when the viewer prefers reduced motion", () => {
    expect(
      shouldPlayTitleFlight({
        tourActive: false,
        onboarding: false,
        reduceMotion: true,
      })
    ).toBe(false);
  });

  it("sends a Watchlist add to the Watchlist tab and Favorite or Recommend to Me", () => {
    expect(titleFlightTab("watchlist")).toBe("watchlist");
    expect(titleFlightTab("favorite")).toBe("me");
    expect(titleFlightTab("recommend")).toBe("me");
  });

  it("holds Recommend for the hexagon and glow before the fly, then matches Return digest fly time", () => {
    expect(titleFlightSettleMs("watchlist")).toBe(TITLE_FLIGHT_MS);
    expect(titleFlightSettleMs("favorite")).toBe(TITLE_FLIGHT_MS);
    expect(titleFlightSettleMs("recommend")).toBe(
      TITLE_FLIGHT_RECOMMEND_STAGE_MS + TITLE_FLIGHT_MS
    );
    expect(titleFlightHintAtMs("watchlist")).toBe(TITLE_FLIGHT_HINT_AT_MS);
    expect(titleFlightHintAtMs("recommend")).toBe(
      TITLE_FLIGHT_RECOMMEND_STAGE_MS + TITLE_FLIGHT_HINT_AT_MS
    );
    expect(recommendCueDelayMs()).toBe(titleFlightSettleMs("recommend"));
  });

  it("finds the poster from a control inside the same origin", () => {
    const poster = fakeNode();
    const origin = fakeNode({
      closest: (selector) =>
        selector === `[${TITLE_FLIGHT_ORIGIN_ATTR}]` ? origin : null,
      querySelector: (selector) =>
        selector === `[${TITLE_FLIGHT_POSTER_ATTR}]` ? poster : null,
    });
    const button = fakeNode({
      closest: (selector) => {
        if (selector === `[${TITLE_FLIGHT_POSTER_ATTR}]`) return null;
        if (selector === `[${TITLE_FLIGHT_ORIGIN_ATTR}]`) return origin;
        return null;
      },
    });
    expect(titleFlightPosterFrom(button)).toBe(poster);
  });

  it("takes For You Title flight from the selected strip card, not the large poster", () => {
    const stripPoster = fakeNode();
    const slot = fakeNode({
      querySelector: (selector) =>
        selector === `[${TITLE_FLIGHT_POSTER_ATTR}]` ? stripPoster : null,
    });
    const largePoster = fakeNode();
    const root = {
      querySelector: (selector: string) => {
        if (selector === `[${FOR_YOU_SLOT_ATTR}="2"]`) return slot;
        return largePoster;
      },
    };
    expect(titleFlightOriginFromForYouSet(2, root)).toBe(stripPoster);
  });

  it("does not invent a For You Title flight origin when that strip slot is gone", () => {
    expect(
      titleFlightOriginFromForYouSet(2, { querySelector: () => null })
    ).toBeNull();
  });

  it("does not use an unmarked For You slot as a Title flight origin", () => {
    const slot = fakeNode();
    expect(
      titleFlightOriginFromForYouSet(1, {
        querySelector: (selector) =>
          selector === `[${FOR_YOU_SLOT_ATTR}="1"]` ? slot : null,
      })
    ).toBeNull();
  });

  it("For You Favorite and Watchlist Title flight leave from the selected strip card", () => {
    const pickerSrc = readFileSync(
      path.resolve(__dirname, "../src/components/ForYouPicker.vue"),
      "utf8"
    );
    const deckSrc = readFileSync(
      path.resolve(__dirname, "../src/components/TitleDeckPicker.vue"),
      "utf8"
    );
    expect(pickerSrc).toContain("titleFlightOriginFromForYouSet");
    expect(pickerSrc).toContain("titleFlightOriginForYou(titleId)");
    expect(pickerSrc).toContain("item.title.id === titleId");
    expect(pickerSrc).not.toContain("stripFlightOrigin");
    expect(deckSrc).toMatch(/class="strip-poster"[\s\S]*?data-flight-poster/);
  });
});

type FakeNode = {
  closest(selector: string): FakeNode | null;
  querySelector(selector: string): FakeNode | null;
};

function fakeNode(partial: Partial<FakeNode> = {}): FakeNode {
  return {
    closest: () => null,
    querySelector: () => null,
    ...partial,
  };
}
