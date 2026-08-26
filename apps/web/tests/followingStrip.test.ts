import { describe, expect, it } from "vitest";
import {
  isFollowingUnseen,
  sortFollowingStripPeople,
  type FollowingStripPerson,
} from "../src/lib/followingStrip";

function person(
  wallet: string,
  lastActivityAt: string | null
): FollowingStripPerson {
  return { walletAddress: wallet, handle: wallet, lastActivityAt };
}

describe("sortFollowingStripPeople", () => {
  it("puts unseen activity ahead of seen, each group newest first", () => {
    const people = [
      person("NQ05A", "2026-08-20T10:00:00.000Z"),
      person("NQ05B", "2026-08-22T10:00:00.000Z"),
      person("NQ05C", "2026-08-21T10:00:00.000Z"),
      person("NQ05D", null),
    ];
    const seen = {
      NQ05B: "2026-08-22T10:00:00.000Z",
      NQ05A: "2026-08-19T10:00:00.000Z",
    };

    expect(sortFollowingStripPeople(people, seen).map((p) => p.walletAddress)).toEqual([
      "NQ05C",
      "NQ05A",
      "NQ05B",
      "NQ05D",
    ]);
  });

  it("treats newer activity after a seen watermark as unseen", () => {
    expect(
      isFollowingUnseen(person("NQ05A", "2026-08-22T12:00:00.000Z"), "2026-08-22T10:00:00.000Z")
    ).toBe(true);
    expect(
      isFollowingUnseen(person("NQ05A", "2026-08-22T10:00:00.000Z"), "2026-08-22T10:00:00.000Z")
    ).toBe(false);
  });
});
