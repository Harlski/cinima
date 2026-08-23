export const INQUIRIES_EMAIL = "inquiries@cinima.app";

export const unavailableCopy = {
  heading: "Cinima isn't available yet",
  lead: "For now, reach out to",
} as const;

export const landingCopy = {
  kicker: "A Nimiq Pay Mini App",
  title: "Social taste discovery for movies and TV",
  lead:
    "Favorite titles you love, Recommend the ones that stand out, and find what to watch through taste overlap with people like you.",
  payOnly:
    "Cinima is only available inside Nimiq Pay. Open it from Discover there to sign in with your wallet.",
  cta: "Explore CINIMA on NIMIQ PAY",
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
