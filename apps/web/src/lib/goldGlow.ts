/** Soft halo: `inset: -8px` plus `blur(12px)` paints this far past the surface. */
const SOFT_HALO_INSET_PX = 8;
const SOFT_HALO_BLUR_PX = 12;
/** Guided tour: bigger, brighter bloom so small pills still read as the target. */
const STRONG_HALO_INSET_PX = 10;
const STRONG_HALO_BLUR_PX = 16;
/** Rotating rim: `inset: -2px` past the surface. */
const RIM_INSET_PX = 2;
const RIM_WIDTH_PX = 1.5;
const STRONG_RIM_INSET_PX = 5;
const STRONG_RIM_WIDTH_PX = 3.5;

/**
 * Extra space the glow shell must keep around the slotted surface so the
 * halo/rim can paint outside the button instead of clipping to its radius.
 */
export function goldGlowShellBleedPx(soft: boolean, strong = false): number {
  if (strong) return STRONG_HALO_INSET_PX + STRONG_HALO_BLUR_PX;
  return soft ? SOFT_HALO_INSET_PX + SOFT_HALO_BLUR_PX : RIM_INSET_PX;
}

export function goldGlowHaloInsetPx(soft: boolean, strong = false): number {
  if (strong) return STRONG_HALO_INSET_PX;
  return soft ? SOFT_HALO_INSET_PX : RIM_INSET_PX;
}

export function goldGlowHaloBlurPx(strong = false): number {
  return strong ? STRONG_HALO_BLUR_PX : SOFT_HALO_BLUR_PX;
}

export function goldGlowRimInsetPx(strong = false): number {
  return strong ? STRONG_RIM_INSET_PX : RIM_INSET_PX;
}

export function goldGlowRimWidthPx(strong = false): number {
  return strong ? STRONG_RIM_WIDTH_PX : RIM_WIDTH_PX;
}
