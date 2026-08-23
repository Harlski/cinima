export const INQUIRIES_EMAIL = "inquiries@cinima.app";

export function inquiriesMailto(): string {
  return `mailto:${INQUIRIES_EMAIL}`;
}

export const landingCopy = {
  kicker: "A Nimiq Pay Mini App",
  title: "Social taste discovery for movies and TV",
  lead:
    "Favorite titles you love, Recommend the ones that stand out, and find what to watch through taste overlap with people like you.",
  /** Outside Nimiq Pay — open the mini app via Pay. */
  ctaExplore: "Explore CINIMA on NIMIQ PAY",
  /** Already inside Nimiq Pay — enter the main app (signing follows). */
  ctaEnter: "Enter CINIMA",
} as const;

export type CinimaSocialChannel = {
  name: "X" | "Telegram" | "Email";
  icon: "logos-twitter-mono" | "logos-telegram-mono" | "envelope";
  href: string | null;
};

export const cinimaSocial: CinimaSocialChannel[] = [
  { name: "X", icon: "logos-twitter-mono", href: null },
  { name: "Telegram", icon: "logos-telegram-mono", href: null },
  { name: "Email", icon: "envelope", href: inquiriesMailto() },
];
