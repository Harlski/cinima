import { describe, expect, it, vi } from "vitest";
import { copyShareLink } from "../src/lib/shareLinkCopy";

describe("copy share link", () => {
  it("writes the URL to the clipboard without selecting page text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const copied = await copyShareLink("https://cinima.app/s/abc123xy", {
      writeText,
    });
    expect(copied).toBe(true);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("https://cinima.app/s/abc123xy");
  });

  it("does not copy an empty URL", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await copyShareLink("", { writeText })).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("returns false when the clipboard is unavailable", async () => {
    expect(await copyShareLink("https://cinima.app/s/abc123xy", null)).toBe(
      false
    );
  });
});
