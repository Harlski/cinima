import { MAX_RECOMMENDS } from "./constants.js";

export const HIGH_SEAS_UNIQUE_VIEWS = 10;

export const ACHIEVEMENT_KINDS = [
  "opening-night",
  "full-house",
  "word-of-mouth",
  "whats-next",
  "bravo",
  "encore",
  "high-seas",
  "season-ticket",
  "thats-a-wrap",
] as const;

export type AchievementKind = (typeof ACHIEVEMENT_KINDS)[number];

const TITLES: Record<AchievementKind, string> = {
  "opening-night": "Opening night",
  "full-house": "Full house",
  "word-of-mouth": "Word of mouth",
  "whats-next": "What's next",
  bravo: "Bravo",
  encore: "Encore",
  "high-seas": "High seas",
  "season-ticket": "Season ticket",
  "thats-a-wrap": "That's a wrap",
};

const HOW: Record<AchievementKind, string> = {
  "opening-night": "Recommended your first title",
  "full-house": "Filled every Recommend slot",
  "word-of-mouth": "Shared a title",
  "whats-next": "Shared your Watchlist",
  bravo: "Thanked another Handle",
  encore: "A Handle thanked you",
  "high-seas": "Viewed ten unique titles",
  "season-ticket": "Came back on a second day",
  "thats-a-wrap": "Finished the guided tour",
};

export function achievementTitle(kind: AchievementKind): string {
  return TITLES[kind];
}

export function achievementHow(kind: AchievementKind): string {
  return HOW[kind];
}

export type CreditRow = {
  kind: AchievementKind;
  title: string;
  how: string;
  earnedAt: string | null;
};

/** Full catalog: earned rows keep their date; the rest stay locked. */
export function creditsCatalog(
  earned: readonly { kind: AchievementKind; earnedAt: string }[]
): CreditRow[] {
  const byKind = new Map(earned.map((row) => [row.kind, row.earnedAt]));
  return ACHIEVEMENT_KINDS.map((kind) => ({
    kind,
    title: achievementTitle(kind),
    how: achievementHow(kind),
    earnedAt: byKind.get(kind) ?? null,
  }));
}

export function shouldAwardOpeningNight(input: {
  alreadyEarned: boolean;
  recommendCountAfter: number;
}): boolean {
  return !input.alreadyEarned && input.recommendCountAfter === 1;
}

export function shouldAwardFullHouse(input: {
  alreadyEarned: boolean;
  movieRecommends: number;
  tvRecommends: number;
}): boolean {
  return (
    !input.alreadyEarned &&
    input.movieRecommends >= MAX_RECOMMENDS &&
    input.tvRecommends >= MAX_RECOMMENDS
  );
}

export function shouldAwardWordOfMouth(input: {
  alreadyEarned: boolean;
  isNewTitleShare: boolean;
}): boolean {
  return !input.alreadyEarned && input.isNewTitleShare;
}

export function shouldAwardWhatsNext(input: {
  alreadyEarned: boolean;
  isNewWatchlistShare: boolean;
}): boolean {
  return !input.alreadyEarned && input.isNewWatchlistShare;
}

export function shouldAwardBravo(input: {
  alreadyEarned: boolean;
  thanksSentAfter: number;
}): boolean {
  return !input.alreadyEarned && input.thanksSentAfter === 1;
}

export function shouldAwardEncore(input: {
  alreadyEarned: boolean;
  thanksReceivedAfter: number;
}): boolean {
  return !input.alreadyEarned && input.thanksReceivedAfter === 1;
}

export function shouldAwardHighSeas(input: {
  alreadyEarned: boolean;
  uniqueTitleViews: number;
}): boolean {
  return !input.alreadyEarned && input.uniqueTitleViews >= HIGH_SEAS_UNIQUE_VIEWS;
}

export function shouldAwardSeasonTicket(input: {
  alreadyEarned: boolean;
  presenceDaysWithActivity: number;
}): boolean {
  return !input.alreadyEarned && input.presenceDaysWithActivity >= 2;
}

export function shouldAwardThatsAWrap(input: {
  alreadyEarned: boolean;
  tourCompleted: boolean;
}): boolean {
  return !input.alreadyEarned && input.tourCompleted;
}
