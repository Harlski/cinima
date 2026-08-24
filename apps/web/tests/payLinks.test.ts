import { describe, expect, it } from "vitest";
import {
  nimiqPayMiniAppHttpsUrl,
  nimiqPayMiniAppSchemeUrl,
  openInPayUrl,
  payMiniAppHost,
} from "@cinima/shared";

describe("pay mini app intent links", () => {
  it("strips scheme for the host form", () => {
    expect(payMiniAppHost("https://cinima.app")).toBe("cinima.app");
    expect(payMiniAppHost("https://cinima.app/")).toBe("cinima.app");
    expect(payMiniAppHost("http://localhost:5174")).toBe("localhost:5174");
    expect(payMiniAppHost("cinima.app")).toBe("cinima.app");
  });

  it("builds scheme and HTTPS intent URLs", () => {
    expect(nimiqPayMiniAppSchemeUrl("https://cinima.app")).toBe(
      "nimiqpay://miniapp?url=cinima.app"
    );
    expect(nimiqPayMiniAppHttpsUrl("https://cinima.app")).toBe(
      "https://nimpay.app/miniapps/open/cinima.app"
    );
    expect(openInPayUrl("http://localhost:5174")).toBe(
      "https://nimpay.app/miniapps/open/localhost:5174"
    );
    expect(nimiqPayMiniAppSchemeUrl("http://localhost:5174")).toBe(
      "nimiqpay://miniapp?url=localhost%3A5174"
    );
  });

  it("keeps path in the host form for deep links", () => {
    expect(payMiniAppHost("https://cinima.app/alice/t/movie/550")).toBe(
      "cinima.app/alice/t/movie/550"
    );
    expect(openInPayUrl("https://cinima.app/alice/t/movie/550")).toBe(
      "https://nimpay.app/miniapps/open/cinima.app/alice/t/movie/550"
    );
  });
});
