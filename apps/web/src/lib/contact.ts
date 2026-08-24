export const INQUIRIES_EMAIL = "cinima.app@gmail.com";

export const CINIMA_X_URL = "https://x.com/cinima_app";

/** Official Nimiq Pay marketing / store landing. */
export const GET_NIMIQ_PAY_URL = "https://nimpay.app/";

export function inquiriesMailto(): string {
  return `mailto:${INQUIRIES_EMAIL}`;
}

export const landingCopy = {
  kicker: "A Nimiq Pay Mini App",
  title: "Social taste discovery for movies and TV",
  lead:
    "Favorite titles you love, Recommend the ones that stand out, and find what to watch through taste overlap with people like you.",
  /** Outside Nimiq Pay — opens the pay-only gate modal. */
  ctaExplore: "Explore CINIMA",
  /** Already inside Nimiq Pay — enter the main app (signing follows). */
  ctaEnter: "Enter CINIMA",
} as const;

/** Copy for the outside-Pay Explore gate on Landing. */
export const payOnlyGateCopy = {
  title: "Sorry!",
  body: "This application is currently only available via Nimiq Pay.",
  alreadyInstalled: "Already Installed?",
  alreadyInstalledOpen: "open",
  getNimiqPay: "Get Nimiq Pay",
  inquiries: "Inquiries?",
} as const;

export type CinimaSocialChannel = {
  name: "X" | "Email";
  icon: "logos-twitter-mono" | "envelope";
  href: string;
};

export const cinimaSocial: CinimaSocialChannel[] = [
  { name: "X", icon: "logos-twitter-mono", href: CINIMA_X_URL },
  { name: "Email", icon: "envelope", href: inquiriesMailto() },
];
