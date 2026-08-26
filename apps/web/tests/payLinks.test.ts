import { describe, expect, it } from "vitest";
import {
  encodeMiniAppUrlQueryValue,
  nimiqPayMiniAppHttpsUrl,
  nimiqPayMiniAppSchemeUrl,
  openInPayUrl,
  payMiniAppHost,
  payMiniAppSchemeTarget,
} from "@cinima/shared";

describe("pay mini app intent links", () => {
  it("strips scheme for the host form", () => {
    expect(payMiniAppHost("https://cinima.app")).toBe("cinima.app");
    expect(payMiniAppHost("https://cinima.app/")).toBe("cinima.app");
    expect(payMiniAppHost("http://localhost:5174")).toBe("localhost:5174");
    expect(payMiniAppHost("cinima.app")).toBe("cinima.app");
  });

  it("builds scheme and HTTPS intent URLs for bare origins", () => {
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
      "nimiqpay://miniapp?url=localhost:5174"
    );
  });

  it("keeps : and / literal in scheme deep links (Pay drops %2F paths)", () => {
    expect(encodeMiniAppUrlQueryValue("http://192.168.4.73:5174/title/movie/700302")).toBe(
      "http://192.168.4.73:5174/title/movie/700302"
    );
    expect(payMiniAppSchemeTarget("http://192.168.4.73:5174/title/movie/700302")).toBe(
      "http://192.168.4.73:5174/title/movie/700302"
    );
    expect(
      nimiqPayMiniAppSchemeUrl("http://192.168.4.73:5174/title/movie/700302")
    ).toBe("nimiqpay://miniapp?url=http://192.168.4.73:5174/title/movie/700302");
    expect(nimiqPayMiniAppSchemeUrl("https://cinima.app/title/movie/550")).toBe(
      "nimiqpay://miniapp?url=https://cinima.app/title/movie/550"
    );
  });

  it("keeps path in the HTTPS open/ host form", () => {
    expect(payMiniAppHost("https://cinima.app/alice/t/movie/550")).toBe(
      "cinima.app/alice/t/movie/550"
    );
    expect(openInPayUrl("https://cinima.app/alice/t/movie/550")).toBe(
      "https://nimpay.app/miniapps/open/cinima.app/alice/t/movie/550"
    );
    expect(payMiniAppHost("https://cinima.app/title/movie/550")).toBe(
      "cinima.app/title/movie/550"
    );
    expect(openInPayUrl("https://cinima.app/title/movie/550")).toBe(
      "https://nimpay.app/miniapps/open/cinima.app/title/movie/550"
    );
  });
});
