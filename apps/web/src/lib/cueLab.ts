import {
  ACHIEVEMENT_KINDS,
  type AchievementKind,
} from "@cinima/shared";

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
  { id: "welcome", label: "Welcome", group: "Welcome" },
  { id: "welcome-back", label: "Welcome Back", group: "Welcome" },
  { id: "tour-offer", label: "Tour offer", group: "Guided tour" },
  { id: "tour-skip-notice", label: "Tour skipped notice", group: "Guided tour" },
  { id: "tour-start", label: "Start tour", group: "Guided tour" },
  { id: "confirm", label: "Confirm dialog", group: "Modals" },
  { id: "pay-only-gate", label: "Pay-only gate", group: "Modals" },
  { id: "pay-title", label: "Title gate", group: "Modals" },
  { id: "share-sheet", label: "Share sheet", group: "Modals" },
] as const;

export type CueLabOverlayId = (typeof CUE_LAB_OVERLAYS)[number]["id"];

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
