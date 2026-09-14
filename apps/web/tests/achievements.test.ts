import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_KINDS,
  HIGH_SEAS_UNIQUE_VIEWS,
  achievementHow,
  achievementTitle,
  achievementsEligible,
  creditsCatalog,
  orderEarnedAchievements,
  shouldAwardBravo,
  shouldAwardEncore,
  shouldAwardFullHouse,
  shouldAwardHighSeas,
  shouldAwardOpeningNight,
  shouldAwardSeasonTicket,
  shouldAwardThatsAWrap,
  shouldAwardWhatsNext,
  shouldAwardWordOfMouth,
  shouldAwardInTheListings,
  shouldAwardSaveThatForLater,
  shouldAwardThatsTheOne,
  shouldAwardPlusOne,
} from "@cinima/shared";

describe("Achievement catalog", () => {
  it("names the catalog and how they unlock", () => {
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
      "in-the-listings",
      "save-that-for-later",
      "thats-the-one",
      "plus-one",
    ]);
    expect(achievementTitle("opening-night")).toBe("Opening night");
    expect(achievementHow("opening-night")).toBe("Recommended your first title");
    expect(achievementTitle("thats-a-wrap")).toBe("That's a wrap");
    expect(achievementHow("thats-a-wrap")).toBe("Finished the guided tour");
    expect(achievementTitle("in-the-listings")).toBe("In the listings");
    expect(achievementHow("in-the-listings")).toBe("Searched for a title");
    expect(achievementTitle("save-that-for-later")).toBe("Save that for later");
    expect(achievementHow("save-that-for-later")).toBe(
      "Added a Search result to your Watchlist"
    );
    expect(achievementTitle("thats-the-one")).toBe("That's the one");
    expect(achievementHow("thats-the-one")).toBe("Recommended a Search result");
    expect(achievementTitle("plus-one")).toBe("Plus one");
    expect(achievementHow("plus-one")).toBe("Followed a Handle");
  });

  it("lists locked catalog rows plus earned dates", () => {
    const rows = creditsCatalog([
      { kind: "opening-night", earnedAt: "2026-09-01T00:00:00.000Z" },
    ]);
    expect(rows).toHaveLength(13);
    expect(rows[0]).toEqual({
      kind: "opening-night",
      title: "Opening night",
      how: "Recommended your first title",
      earnedAt: "2026-09-01T00:00:00.000Z",
    });
    expect(rows.find((row) => row.kind === "bravo")?.earnedAt).toBeNull();
  });

  it("withholds Achievements until the Guided tour is skipped or completed", () => {
    expect(
      achievementsEligible({ tourStatus: "never", alreadyHasAchievement: false })
    ).toBe(false);
    expect(
      achievementsEligible({ tourStatus: "skipped", alreadyHasAchievement: false })
    ).toBe(true);
    expect(
      achievementsEligible({ tourStatus: "completed", alreadyHasAchievement: false })
    ).toBe(true);
  });

  it("treats a Handle that already has an Achievement as past the tour gate", () => {
    expect(
      achievementsEligible({ tourStatus: "never", alreadyHasAchievement: true })
    ).toBe(true);
  });

  it("awards Opening night once they have Recommended, including after a withheld tour Recommend", () => {
    expect(shouldAwardOpeningNight({ alreadyEarned: false, recommendCountAfter: 1 })).toBe(
      true
    );
    expect(shouldAwardOpeningNight({ alreadyEarned: false, recommendCountAfter: 2 })).toBe(
      true
    );
    expect(shouldAwardOpeningNight({ alreadyEarned: false, recommendCountAfter: 0 })).toBe(
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

  it("awards Word of mouth and What's next once a share of that kind exists", () => {
    expect(shouldAwardWordOfMouth({ alreadyEarned: false, hasTitleShare: true })).toBe(
      true
    );
    expect(shouldAwardWordOfMouth({ alreadyEarned: true, hasTitleShare: true })).toBe(
      false
    );
    expect(shouldAwardWhatsNext({ alreadyEarned: false, hasWatchlistShare: true })).toBe(
      true
    );
    expect(shouldAwardWhatsNext({ alreadyEarned: false, hasWatchlistShare: false })).toBe(
      false
    );
  });

  it("awards Bravo and Encore once Thanks has been sent or received", () => {
    expect(shouldAwardBravo({ alreadyEarned: false, thanksSentAfter: 1 })).toBe(true);
    expect(shouldAwardBravo({ alreadyEarned: false, thanksSentAfter: 2 })).toBe(true);
    expect(shouldAwardBravo({ alreadyEarned: false, thanksSentAfter: 0 })).toBe(false);
    expect(shouldAwardEncore({ alreadyEarned: false, thanksReceivedAfter: 1 })).toBe(true);
    expect(shouldAwardEncore({ alreadyEarned: true, thanksReceivedAfter: 1 })).toBe(false);
  });

  it("puts That's a wrap first when the tour complete also unlocks other credits", () => {
    expect(orderEarnedAchievements(["opening-night", "thats-a-wrap"])).toEqual([
      "thats-a-wrap",
      "opening-night",
    ]);
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

  it("awards In the listings on the first Search", () => {
    expect(shouldAwardInTheListings({ alreadyEarned: false, searchCountAfter: 0 })).toBe(false);
    expect(shouldAwardInTheListings({ alreadyEarned: false, searchCountAfter: 1 })).toBe(true);
    expect(shouldAwardInTheListings({ alreadyEarned: true, searchCountAfter: 2 })).toBe(false);
  });

  it("awards Save that for later and That's the one only after a Search result open", () => {
    expect(
      shouldAwardSaveThatForLater({
        alreadyEarned: false,
        hasWatchlistAddAfterSearchOpen: true,
      })
    ).toBe(true);
    expect(
      shouldAwardSaveThatForLater({
        alreadyEarned: false,
        hasWatchlistAddAfterSearchOpen: false,
      })
    ).toBe(false);
    expect(
      shouldAwardSaveThatForLater({
        alreadyEarned: true,
        hasWatchlistAddAfterSearchOpen: true,
      })
    ).toBe(false);
    expect(
      shouldAwardThatsTheOne({ alreadyEarned: false, hasRecommendAfterSearchOpen: true })
    ).toBe(true);
    expect(
      shouldAwardThatsTheOne({ alreadyEarned: false, hasRecommendAfterSearchOpen: false })
    ).toBe(false);
    expect(
      shouldAwardThatsTheOne({ alreadyEarned: true, hasRecommendAfterSearchOpen: true })
    ).toBe(false);
  });

  it("awards Plus one on the first Follow", () => {
    expect(shouldAwardPlusOne({ alreadyEarned: false, followCountAfter: 0 })).toBe(false);
    expect(shouldAwardPlusOne({ alreadyEarned: false, followCountAfter: 1 })).toBe(true);
    expect(shouldAwardPlusOne({ alreadyEarned: true, followCountAfter: 1 })).toBe(false);
  });
});
