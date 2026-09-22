import { describe, expect, it } from "vitest";
import {
  swipeRemoveDragX,
  swipeRemoveRest,
  swipeRemoveRestX,
  SWIPE_REMOVE_COMMIT_PX,
} from "../src/lib/swipeRemove";

describe("swipeRemove", () => {
  it("ignores a rightward drag", () => {
    expect(swipeRemoveDragX(40, 320)).toBe(0);
    expect(swipeRemoveRest(0)).toBe("closed");
  });

  it("follows a left drag and commits past the remove threshold", () => {
    expect(swipeRemoveDragX(-40, 320)).toBe(-40);
    expect(swipeRemoveRest(-40)).toBe("open");
    expect(swipeRemoveRest(-72)).toBe("commit");
  });

  it("does not drag farther than the remove tray", () => {
    expect(swipeRemoveDragX(-400, 320)).toBe(-112);
  });

  it("rests open short of the delete distance so a later tap does not delete", () => {
    expect(swipeRemoveRestX("open")).toBeGreaterThan(-SWIPE_REMOVE_COMMIT_PX);
    expect(swipeRemoveRest(swipeRemoveRestX("open"))).toBe("open");
  });
});
