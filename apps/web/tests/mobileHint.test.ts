import { describe, expect, it } from "vitest";
import { seemsLikeMobile } from "../src/lib/mobileHint";

const desktopChromeUa =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const iphoneUa =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const androidPhoneUa =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const ipadDesktopModeUa =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const nimiqPayUa = "Mozilla/5.0 (Linux; Android 14) NimiqPay/2.0";

describe("seemsLikeMobile", () => {
  it("treats phones as mobile from the user agent", () => {
    expect(
      seemsLikeMobile({
        userAgent: iphoneUa,
        maxTouchPoints: 5,
        pointerCoarse: true,
      })
    ).toBe(true);
    expect(
      seemsLikeMobile({
        userAgent: androidPhoneUa,
        maxTouchPoints: 5,
        pointerCoarse: true,
      })
    ).toBe(true);
  });

  it("treats Nimiq Pay as mobile", () => {
    expect(
      seemsLikeMobile({
        userAgent: nimiqPayUa,
        maxTouchPoints: 0,
        pointerCoarse: false,
      })
    ).toBe(true);
  });

  it("treats iPad desktop-mode Safari as mobile via touch", () => {
    expect(
      seemsLikeMobile({
        userAgent: ipadDesktopModeUa,
        maxTouchPoints: 5,
        pointerCoarse: true,
      })
    ).toBe(true);
  });

  it("does not treat a mouse desktop as mobile", () => {
    expect(
      seemsLikeMobile({
        userAgent: desktopChromeUa,
        maxTouchPoints: 0,
        pointerCoarse: false,
      })
    ).toBe(false);
  });
});
