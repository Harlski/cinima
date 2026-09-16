import { describe, expect, it } from "vitest";
import {
  bottomTabsTopPx,
  viewportChromeCssVars,
} from "../src/lib/viewportChrome";

describe("viewportChromeCssVars", () => {
  it("defaults to layout height when visual viewport is missing", () => {
    expect(viewportChromeCssVars(null, 800)).toEqual({
      "--vv-offset-top": "0px",
      "--vv-height": "800px",
      "--vv-bottom-inset": "0px",
    });
  });

  it("reflects rubber-band offset from the visual viewport", () => {
    expect(
      viewportChromeCssVars({ offsetTop: 52, height: 748 }, 800)
    ).toEqual({
      "--vv-offset-top": "52px",
      "--vv-height": "748px",
      "--vv-bottom-inset": "0px",
    });
  });

  it("does not deform page chrome while overlay trap is open", () => {
    expect(
      viewportChromeCssVars({ offsetTop: 52, height: 748 }, 800, {
        freeze: true,
      })
    ).toEqual({
      "--vv-offset-top": "0px",
      "--vv-height": "800px",
      "--vv-bottom-inset": "0px",
    });
  });
});

describe("bottomTabsTopPx", () => {
  it("sits flush with the layout bottom when the viewport is stable", () => {
    expect(bottomTabsTopPx(null, 800, 80)).toBe(720);
  });

  it("tracks the visual viewport bottom during rubber-band scroll", () => {
    expect(bottomTabsTopPx({ offsetTop: 52, height: 748 }, 800, 80)).toBe(
      720
    );
  });
});

describe("viewport bottom inset", () => {
  it("records the gap below a shorter visual viewport", () => {
    expect(
      viewportChromeCssVars({ offsetTop: 0, height: 720 }, 800)
    ).toEqual({
      "--vv-offset-top": "0px",
      "--vv-height": "720px",
      "--vv-bottom-inset": "80px",
    });
  });
});

describe("bogus visual viewport (Android / Pay WebView)", () => {
  it("does not collapse chrome when the visual viewport reports 0 height", () => {
    expect(viewportChromeCssVars({ offsetTop: 0, height: 0 }, 800)).toEqual({
      "--vv-offset-top": "0px",
      "--vv-height": "800px",
      "--vv-bottom-inset": "0px",
    });
  });

  it("does not pad For You under the fold when offsetTop equals the layout height", () => {
    const vars = viewportChromeCssVars({ offsetTop: 800, height: 0 }, 800);
    expect(Number.parseFloat(vars["--vv-offset-top"])).toBe(0);
    expect(Number.parseFloat(vars["--vv-height"])).toBe(800);
  });
});
