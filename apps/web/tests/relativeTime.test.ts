import { describe, expect, it } from "vitest";
import { relativeTime } from "../src/lib/relativeTime";

describe("relativeTime", () => {
  const now = Date.parse("2026-09-11T12:00:00.000Z");

  it("names short ages without extra words", () => {
    expect(relativeTime("2026-09-11T11:59:30.000Z", now)).toBe("just now");
    expect(relativeTime("2026-09-11T11:50:00.000Z", now)).toBe("10m ago");
    expect(relativeTime("2026-09-11T09:00:00.000Z", now)).toBe("3h ago");
    expect(relativeTime("2026-09-09T12:00:00.000Z", now)).toBe("2d ago");
  });
});
