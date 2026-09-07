import { describe, expect, it } from "vitest";
import {
  searchDockBottomPx,
  searchStageBox,
} from "../src/lib/searchViewport";

const chrome = {
  layoutHeight: 800,
  headerHeight: 44,
  tabsHeight: 80,
  dockHeight: 70,
};

describe("searchDockBottomPx", () => {
  it("sits above the tab bar when the keyboard is closed", () => {
    expect(
      searchDockBottomPx(chrome, { offsetTop: 0, height: 800 })
    ).toBe(80);
  });

  it("stays above the tab bar when the keyboard is open", () => {
    expect(
      searchDockBottomPx(chrome, { offsetTop: 0, height: 500 })
    ).toBe(380);
  });

  it("clears a raised tab bar when the visual viewport is shorter", () => {
    expect(
      searchDockBottomPx(chrome, { offsetTop: 0, height: 752 })
    ).toBe(128);
  });
});

describe("searchStageBox", () => {
  it("fills the area between the header and the search dock", () => {
    expect(searchStageBox(chrome, { offsetTop: 0, height: 800 })).toEqual({
      top: 44,
      height: 606,
    });
  });

  it("shrinks to the visual viewport when the keyboard is open", () => {
    expect(searchStageBox(chrome, { offsetTop: 0, height: 500 })).toEqual({
      top: 44,
      height: 306,
    });
  });

  it("clips to a scrolled visual viewport", () => {
    expect(
      searchStageBox(chrome, { offsetTop: 60, height: 500 })
    ).toEqual({
      top: 60,
      height: 350,
    });
  });

  const iphoneFieldDock = {
    layoutHeight: 844,
    headerHeight: 47,
    tabsHeight: 96,
    dockHeight: 110,
  };

  it("keeps a results stage on iPhone with the keyboard open over a field-only dock", () => {
    expect(
      searchStageBox(iphoneFieldDock, { offsetTop: 0, height: 508 }).height
    ).toBeGreaterThan(0);
  });

  it("keeps a results stage when iOS scrolls the visual viewport to the focused field", () => {
    expect(
      searchStageBox(iphoneFieldDock, { offsetTop: 280, height: 508 }).height
    ).toBeGreaterThan(0);
  });
});
