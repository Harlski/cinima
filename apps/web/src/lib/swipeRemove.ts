/** Distance that reveals the Remove tray without deleting yet. */
export const SWIPE_REMOVE_OPEN_PX = 36;

/** Distance that deletes on release. */
export const SWIPE_REMOVE_COMMIT_PX = 72;

/** Width of the revealed Remove tray. Also the farthest the row will travel. */
export const SWIPE_REMOVE_TRAY_PX = 112;

/** Resting offset while Remove is visible. Stays short of the commit distance. */
export const SWIPE_REMOVE_OPEN_REST_PX = 64;

export type SwipeRemoveRest = "closed" | "open" | "commit";

/** Leftward drag only, clamped to the remove tray (or the row, if narrower). */
export function swipeRemoveDragX(dx: number, width: number): number {
  if (dx >= 0) return 0;
  const limit = Math.min(SWIPE_REMOVE_TRAY_PX, Math.max(width, 1));
  return Math.max(dx, -limit);
}

export function swipeRemoveRest(dx: number): SwipeRemoveRest {
  if (dx <= -SWIPE_REMOVE_COMMIT_PX) return "commit";
  if (dx <= -SWIPE_REMOVE_OPEN_PX) return "open";
  return "closed";
}

export function swipeRemoveRestX(rest: SwipeRemoveRest): number {
  if (rest === "open") return -SWIPE_REMOVE_OPEN_REST_PX;
  return 0;
}
