import { describe, expect, it } from "vitest";
import { payOpenHttpsUrl, payOpenTitleUrl } from "../src/lib/payLinks";

describe("Already Installed web CTAs", () => {
  it("opens origin in Pay via HTTPS intent, not a custom scheme", () => {
    expect(payOpenHttpsUrl("https://cinima.app")).toBe(
      "https://nimpay.app/miniapps/open/cinima.app"
    );
  });

  it("opens a title in Pay via HTTPS Pay intent", () => {
    expect(payOpenTitleUrl("tmdb:movie:550", "https://cinima.app")).toBe(
      "https://nimpay.app/miniapps/open/cinima.app/title/movie/550"
    );
  });

  it("opens a Watchlist Share in Pay via HTTPS intent", () => {
    expect(payOpenHttpsUrl("https://cinima.app/alice/list")).toBe(
      "https://nimpay.app/miniapps/open/cinima.app/alice/list"
    );
  });

  it("opens a Public Profile in Pay via HTTPS intent", () => {
    expect(payOpenHttpsUrl("https://cinima.app/alice")).toBe(
      "https://nimpay.app/miniapps/open/cinima.app/alice"
    );
  });
});
