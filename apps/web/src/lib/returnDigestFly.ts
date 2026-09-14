/** Identicon flight from Return digest into the Me tab. */

export type DigestBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export const DIGEST_FLY_MS = 580;
export const DIGEST_FLY_STAGGER_MS = 42;
export const DIGEST_ME_HINT_AT_MS = 360;

/** Translate and shrink a digest face so its center lands on the Me Identicon. */
export function digestFaceFly(from: DigestBox, to: DigestBox): {
  dx: number;
  dy: number;
  scale: number;
} {
  const fromCx = from.left + from.width / 2;
  const fromCy = from.top + from.height / 2;
  const toCx = to.left + to.width / 2;
  const toCy = to.top + to.height / 2;
  const fromSize = Math.max(from.width, 1);
  return {
    dx: toCx - fromCx,
    dy: toCy - fromCy,
    scale: Math.max(to.width, 1) / fromSize,
  };
}

export function digestFlySettleMs(count: number): number {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return 0;
  return DIGEST_FLY_MS + (n - 1) * DIGEST_FLY_STAGGER_MS;
}
