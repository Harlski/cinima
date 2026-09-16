import { describe, expect, it } from "vitest";
import { handleCommentsPath } from "../src/lib/handleComments";

describe("handleCommentsPath", () => {
  it("requests the first page of 5 Comments for a Handle", () => {
    expect(handleCommentsPath("NQ05HANDLECOMMENTSME00000000000001")).toBe(
      "/users/NQ05HANDLECOMMENTSME00000000000001/comments?limit=5&offset=0"
    );
  });

  it("requests the next page from the loaded count", () => {
    expect(handleCommentsPath("NQ05HANDLECOMMENTSPEER00000000002", 5)).toBe(
      "/users/NQ05HANDLECOMMENTSPEER00000000002/comments?limit=5&offset=5"
    );
  });
});
