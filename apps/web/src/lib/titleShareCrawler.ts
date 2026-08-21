/** Social crawlers that need Open Graph HTML instead of the SPA shell. */
export function isTitleShareCrawler(userAgent: string): boolean {
  return /facebookexternalhit|Facebot|Twitterbot|WhatsApp|Slackbot|TelegramBot|LinkedInBot|Discordbot|Pinterest/i.test(
    userAgent
  );
}

export const TITLE_SHARE_PATH =
  /^\/([^/]+)\/t\/(movie|tv)\/(\d+)\/?$/;
