import { describe, expect, it } from "vitest";
import {
  canDismissCommentSheet,
  canPostComment,
  shouldCloseCommentSheet,
} from "../src/lib/commentComposer";

describe("title comment sheet", () => {
  it("posts only a real comment while idle", () => {
    expect(canPostComment("Still holds up", false)).toBe(true);
    expect(canPostComment("  Still holds up  ", false)).toBe(true);
    expect(canPostComment("   ", false)).toBe(false);
    expect(canPostComment("Still holds up", true)).toBe(false);
  });

  it("stays open while Post is in flight", () => {
    expect(canDismissCommentSheet(true)).toBe(false);
    expect(canDismissCommentSheet(false)).toBe(true);
  });

  it("closes after a successful post, not a failed one", () => {
    expect(
      shouldCloseCommentSheet({
        wasPosting: true,
        posting: false,
        body: "",
      })
    ).toBe(true);
    expect(
      shouldCloseCommentSheet({
        wasPosting: true,
        posting: false,
        body: "Still holds up",
      })
    ).toBe(false);
    expect(
      shouldCloseCommentSheet({
        wasPosting: false,
        posting: true,
        body: "Still holds up",
      })
    ).toBe(false);
  });
});
