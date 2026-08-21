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

  it("sits on the keyboard when overlap is more than 48px", () => {
    expect(
      searchDockBottomPx(chrome, { offsetTop: 0, height: 500 })
    ).toBe(300);
  });

  it("ignores keyboard overlap of 48px or less", () => {
    expect(
      searchDockBottomPx(chrome, { offsetTop: 0, height: 752 })
    ).toBe(80);
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
      height: 386,
    });
  });

  it("clips to a scrolled visual viewport", () => {
    expect(
      searchStageBox(chrome, { offsetTop: 60, height: 500 })
    ).toEqual({
      top: 60,
      height: 430,
    });
  });
});
