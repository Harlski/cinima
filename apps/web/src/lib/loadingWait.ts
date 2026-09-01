/** Visible lines under the hex spinner while a screen waits on the API. */
export const LOADING_WAIT_LINES = [
  "Preparing the popcorn",
  "Rewinding the tape",
  "Dimming the lights",
  "Warming the projector",
  "Finding your seat",
  "Opening the curtains",
  "Cueing the trailer",
  "Threading the film",
  "Tearing the tickets",
  "Sweeping the aisle",
  "Flipping the marquee",
  "Hushing the lobby",
  "Focusing the lens",
  "Adjusting the tracking",
  "Rolling the credits",
] as const;

/** How long each line stays on screen. */
export const LOADING_WAIT_MS = 2_800;

export function shuffledLoadingLines(
  lines: readonly string[] = LOADING_WAIT_LINES,
  rand: () => number = Math.random
): string[] {
  const out = [...lines];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const current = out[i]!;
    out[i] = out[j]!;
    out[j] = current;
  }
  return out;
}

export function nextLoadingLineIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return (index + 1) % length;
}
