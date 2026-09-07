/** Soft halo: `inset: -8px` plus `blur(12px)` paints this far past the surface. */
const SOFT_HALO_INSET_PX = 8;
const SOFT_HALO_BLUR_PX = 12;
/** Rotating rim: `inset: -2px` past the surface. */
const RIM_INSET_PX = 2;

/**
 * Extra space the glow shell must keep around the slotted surface so the
 * halo/rim can paint outside the button instead of clipping to its radius.
 */
export function goldGlowShellBleedPx(soft: boolean): number {
  return soft ? SOFT_HALO_INSET_PX + SOFT_HALO_BLUR_PX : RIM_INSET_PX;
}

export function goldGlowHaloInsetPx(soft: boolean): number {
  return soft ? SOFT_HALO_INSET_PX : RIM_INSET_PX;
}

export function goldGlowRimInsetPx(): number {
  return RIM_INSET_PX;
}
