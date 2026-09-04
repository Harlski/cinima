export type ShareVisitKind = "title" | "profile" | "watchlist";
export type ShareVisitChannel = "web" | "pay";
export type ShareVisitIntent = "open" | "pay_cta";

export type ShareVisitRequest = {
  kind: ShareVisitKind;
  code?: string;
  handle?: string;
  channel: ShareVisitChannel;
  intent?: ShareVisitIntent;
};

const KINDS = new Set<ShareVisitKind>(["title", "profile", "watchlist"]);
const CHANNELS = new Set<ShareVisitChannel>(["web", "pay"]);

export function isShareVisitKind(value: unknown): value is ShareVisitKind {
  return typeof value === "string" && KINDS.has(value as ShareVisitKind);
}

export function isShareVisitChannel(value: unknown): value is ShareVisitChannel {
  return typeof value === "string" && CHANNELS.has(value as ShareVisitChannel);
}

/** Channel for a Share visit: pay inside Nimiq Pay, otherwise web. */
export function shareVisitChannel(inPay: boolean): ShareVisitChannel {
  return inPay ? "pay" : "web";
}

/** Intent for a Share visit. Missing or unknown values are an open. */
export function shareVisitIntent(raw?: string | null): ShareVisitIntent {
  return raw === "pay_cta" ? "pay_cta" : "open";
}

/** Social crawler UAs must not increment Share visits if they somehow POST. */
export function isShareVisitCrawler(userAgent: string): boolean {
  return /facebookexternalhit|Facebot|FacebookBot|meta-externalagent|meta-externalfetcher|Twitterbot|WhatsApp|Slackbot|TelegramBot|LinkedInBot|Discordbot|Pinterest/i.test(
    userAgent
  );
}
