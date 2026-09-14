import {
  ACHIEVEMENT_KINDS,
  DIGEST_THANKER_CAP,
  makeTitleId,
  type AchievementKind,
  type ReturnDigest,
} from "@cinima/shared";
import {
  isProfileHeaderVariantId,
  type ProfileHeaderVariantId,
} from "./profileHeaderLab";

/** Signed-in AppShell only; never on Landing or public share pages. */
export function cueLabEntryVisible(opts: { inAppShell: boolean }): boolean {
  return import.meta.env.DEV && opts.inAppShell;
}

/** One Marquee preview per Achievement in the catalog. */
export function cueLabMarqueeKinds(): AchievementKind[] {
  return [...ACHIEVEMENT_KINDS];
}

export const CUE_LAB_OVERLAYS = [
  { id: "recommend-cue", label: "Recommend cue", group: "Cues" },
  { id: "return-digest", label: "Return digest", group: "Cues" },
  { id: "profile-header-solid", label: "Solid card", group: "Profile header" },
  { id: "profile-header-fade", label: "Fade into Recommends", group: "Profile header" },
  { id: "profile-header-bleed", label: "Bleed, no card", group: "Profile header" },
  { id: "profile-header-strip", label: "Stats strip", group: "Profile header" },
  { id: "profile-header-cover", label: "Poster cover", group: "Profile header" },
  { id: "profile-header-banner-bleed", label: "Cover + bleed", group: "Profile header" },
  { id: "welcome", label: "Welcome", group: "Welcome" },
  { id: "welcome-back", label: "Welcome Back", group: "Welcome" },
  { id: "tour-offer", label: "Tour offer", group: "Guided tour" },
  { id: "tour-skip-notice", label: "Tour skipped notice", group: "Guided tour" },
  { id: "tour-start", label: "Start tour", group: "Guided tour" },
  { id: "confirm", label: "Confirm dialog", group: "Modals" },
  { id: "send-nim", label: "Send Custom Message", group: "Modals" },
  { id: "send-nim-sent", label: "Send sent", group: "Modals" },
  { id: "watchlist-leave", label: "Watchlist leave", group: "Modals" },
  { id: "pay-only-gate", label: "Pay-only gate", group: "Modals" },
  { id: "pay-title", label: "Title gate", group: "Modals" },
  { id: "share-sheet", label: "Share sheet", group: "Modals" },
] as const;

export type CueLabOverlayId = (typeof CUE_LAB_OVERLAYS)[number]["id"];

const PROFILE_HEADER_OVERLAY_PREFIX = "profile-header-";

export function cueLabProfileHeaderVariant(
  overlayId: CueLabOverlayId | string
): ProfileHeaderVariantId | null {
  if (!overlayId.startsWith(PROFILE_HEADER_OVERLAY_PREFIX)) return null;
  const id = overlayId.slice(PROFILE_HEADER_OVERLAY_PREFIX.length);
  return isProfileHeaderVariantId(id) ? id : null;
}

export function cueLabOverlayIds(): CueLabOverlayId[] {
  return CUE_LAB_OVERLAYS.map((row) => row.id);
}

export function cueLabOverlayGroups(): {
  group: string;
  overlays: (typeof CUE_LAB_OVERLAYS)[number][];
}[] {
  const groups: {
    group: string;
    overlays: (typeof CUE_LAB_OVERLAYS)[number][];
  }[] = [];
  for (const overlay of CUE_LAB_OVERLAYS) {
    const last = groups[groups.length - 1];
    if (last && last.group === overlay.group) {
      last.overlays.push(overlay);
    } else {
      groups.push({ group: overlay.group, overlays: [overlay] });
    }
  }
  return groups;
}

/** Local Cue lab fixture. Does not pay and does not attach a User Send. */
export function cueLabSendPreview(): {
  kind: "title";
  toWallet: string;
  handle: string;
  titleId: string;
} {
  return {
    kind: "title",
    toWallet: "NQ01PEERAAAAOVERLAPDEMOWALLET00001",
    handle: "cinephile",
    titleId: makeTitleId("movie", 550),
  };
}

/** Chain hash for the Cue lab Sent screen (Nimiq Watch link). */
export const CUE_LAB_SEND_TX_HASH =
  "2cdb91140166c30326b0749627784f9f23334e5f37490b3a142883462eed9b59";

/** Local Cue lab fixture: eight Identicons, ninth Thanker only counted. */
export function cueLabReturnDigest(): ReturnDigest {
  const thankers = [
    { walletAddress: "NQ05DEMOCINIMACYCLETWOWALLET0000001", handle: "demouser" },
    { walletAddress: "NQ01PEERAAAAOVERLAPDEMOWALLET00001", handle: "cinephile" },
    { walletAddress: "NQ02PEERBBBBTOASTEOVERLAPWALLET02", handle: "nightowl" },
    { walletAddress: "NQ05DEMONIMCHARTSCYCLETWOWALLET0001", handle: "demoalice" },
    { walletAddress: "NQ63XN7E020HH0RNRD6G7QT1Y7AMH1P5H84B", handle: "fudger" },
    { walletAddress: "NQ05THANKSTESTWALLETPEERAA000001", handle: "ada" },
    { walletAddress: "NQ05THANKSTESTWALLETPEERBB000001", handle: "nic" },
    { walletAddress: "NQ05THANKSTESTWALLETME00000000001", handle: "meuser" },
  ];
  return {
    thanksCount: thankers.length + 1,
    nimReceived: 4,
    thankers: thankers.slice(0, DIGEST_THANKER_CAP),
  };
}

/** Continue leaves Me / title for Discover, but stays on Cue lab and Discover. */
export function digestContinueGoesToDiscover(
  routeName: string | symbol | null | undefined
): boolean {
  return routeName !== "discover" && routeName !== "cue-lab";
}
