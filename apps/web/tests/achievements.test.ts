import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_KINDS,
  HIGH_SEAS_UNIQUE_VIEWS,
  achievementHow,
  achievementTitle,
  creditsCatalog,
  shouldAwardBravo,
  shouldAwardEncore,
  shouldAwardFullHouse,
  shouldAwardHighSeas,
  shouldAwardOpeningNight,
  shouldAwardSeasonTicket,
  shouldAwardThatsAWrap,
  shouldAwardWhatsNext,
  shouldAwardWordOfMouth,
} from "@cinima/shared";

describe("Achievement catalog", () => {
  it("names the nine credits and how they unlock", () => {
    expect([...ACHIEVEMENT_KINDS]).toEqual([
      "opening-night",
      "full-house",
      "word-of-mouth",
      "whats-next",
      "bravo",
      "encore",
      "high-seas",
      "season-ticket",
      "thats-a-wrap",
    ]);
    expect(achievementTitle("opening-night")).toBe("Opening night");
    expect(achievementHow("opening-night")).toBe("Recommended your first title");
    expect(achievementTitle("thats-a-wrap")).toBe("That's a wrap");
    expect(achievementHow("thats-a-wrap")).toBe("Finished the guided tour");
  });

  it("lists locked catalog rows plus earned dates", () => {
    const rows = creditsCatalog([
      { kind: "opening-night", earnedAt: "2026-09-01T00:00:00.000Z" },
    ]);
    expect(rows).toHaveLength(9);
    expect(rows[0]).toEqual({
      kind: "opening-night",
      title: "Opening night",
      how: "Recommended your first title",
      earnedAt: "2026-09-01T00:00:00.000Z",
    });
    expect(rows.find((row) => row.kind === "bravo")?.earnedAt).toBeNull();
  });

  it("awards Opening night on the first Recommend only", () => {
    expect(shouldAwardOpeningNight({ alreadyEarned: false, recommendCountAfter: 1 })).toBe(
      true
    );
    expect(shouldAwardOpeningNight({ alreadyEarned: false, recommendCountAfter: 2 })).toBe(
      false
    );
    expect(shouldAwardOpeningNight({ alreadyEarned: true, recommendCountAfter: 1 })).toBe(
      false
    );
  });

  it("awards Full house when both slates are full", () => {
    expect(
      shouldAwardFullHouse({ alreadyEarned: false, movieRecommends: 6, tvRecommends: 6 })
    ).toBe(true);
    expect(
      shouldAwardFullHouse({ alreadyEarned: false, movieRecommends: 6, tvRecommends: 5 })
    ).toBe(false);
    expect(
      shouldAwardFullHouse({ alreadyEarned: true, movieRecommends: 6, tvRecommends: 6 })
    ).toBe(false);
  });

  it("awards Word of mouth and What's next on the first share of that kind", () => {
    expect(shouldAwardWordOfMouth({ alreadyEarned: false, isNewTitleShare: true })).toBe(
      true
    );
    expect(shouldAwardWordOfMouth({ alreadyEarned: true, isNewTitleShare: true })).toBe(
      false
    );
    expect(shouldAwardWhatsNext({ alreadyEarned: false, isNewWatchlistShare: true })).toBe(
      true
    );
    expect(shouldAwardWhatsNext({ alreadyEarned: false, isNewWatchlistShare: false })).toBe(
      false
    );
  });

  it("awards Bravo and Encore on the first Thanks each way", () => {
    expect(shouldAwardBravo({ alreadyEarned: false, thanksSentAfter: 1 })).toBe(true);
    expect(shouldAwardBravo({ alreadyEarned: false, thanksSentAfter: 2 })).toBe(false);
    expect(shouldAwardEncore({ alreadyEarned: false, thanksReceivedAfter: 1 })).toBe(true);
    expect(shouldAwardEncore({ alreadyEarned: true, thanksReceivedAfter: 1 })).toBe(false);
  });

  it("awards High seas at ten unique title views", () => {
    expect(HIGH_SEAS_UNIQUE_VIEWS).toBe(10);
    expect(shouldAwardHighSeas({ alreadyEarned: false, uniqueTitleViews: 9 })).toBe(false);
    expect(shouldAwardHighSeas({ alreadyEarned: false, uniqueTitleViews: 10 })).toBe(true);
    expect(shouldAwardHighSeas({ alreadyEarned: true, uniqueTitleViews: 12 })).toBe(false);
  });

  it("awards Season ticket on the second Presence day", () => {
    expect(shouldAwardSeasonTicket({ alreadyEarned: false, presenceDaysWithActivity: 1 })).toBe(
      false
    );
    expect(shouldAwardSeasonTicket({ alreadyEarned: false, presenceDaysWithActivity: 2 })).toBe(
      true
    );
  });

  it("awards That's a wrap when the Guided tour completes", () => {
    expect(shouldAwardThatsAWrap({ alreadyEarned: false, tourCompleted: true })).toBe(true);
    expect(shouldAwardThatsAWrap({ alreadyEarned: false, tourCompleted: false })).toBe(false);
    expect(shouldAwardThatsAWrap({ alreadyEarned: true, tourCompleted: true })).toBe(false);
  });
});
