export const INQUIRIES_EMAIL = "inquiries@cinima.app";

export const unavailableCopy = {
  heading: "Cinima isn't available yet",
  lead: "For now, reach out to",
} as const;

export type CinimaSocialChannel = {
  name: "X" | "Telegram";
  icon: "logos-twitter-mono" | "logos-telegram-mono";
  href: string | null;
};

export const cinimaSocial: CinimaSocialChannel[] = [
  { name: "X", icon: "logos-twitter-mono", href: null },
  { name: "Telegram", icon: "logos-telegram-mono", href: null },
];

export function inquiriesMailto(): string {
  return `mailto:${INQUIRIES_EMAIL}`;
}
