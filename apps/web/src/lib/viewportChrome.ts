export type VisualViewportSnapshot = {
  offsetTop: number;
  height: number;
};

/** Pay / Android WebViews sometimes report 0 height or a full-screen offsetTop. */
const MIN_VISUAL_VIEWPORT_HEIGHT_PX = 80;

export function saneVisualViewport(
  viewport: VisualViewportSnapshot | null,
  layoutHeight: number
): VisualViewportSnapshot {
  if (
    !viewport ||
    !Number.isFinite(viewport.height) ||
    !Number.isFinite(viewport.offsetTop) ||
    viewport.height < MIN_VISUAL_VIEWPORT_HEIGHT_PX ||
    viewport.offsetTop < 0 ||
    viewport.offsetTop > layoutHeight * 0.45
  ) {
    return { offsetTop: 0, height: layoutHeight };
  }
  return viewport;
}

export function visualViewportBottomInsetPx(
  viewport: VisualViewportSnapshot | null,
  layoutHeight: number
): number {
  const { offsetTop, height } = saneVisualViewport(viewport, layoutHeight);
  return Math.max(0, layoutHeight - (offsetTop + height));
}

/** CSS custom properties that pin fixed chrome to the visual viewport. */
export function viewportChromeCssVars(
  viewport: VisualViewportSnapshot | null,
  layoutHeight: number
): Record<"--vv-offset-top" | "--vv-height" | "--vv-bottom-inset", string> {
  const { offsetTop, height } = saneVisualViewport(viewport, layoutHeight);
  return {
    "--vv-offset-top": `${offsetTop}px`,
    "--vv-height": `${height}px`,
    "--vv-bottom-inset": `${visualViewportBottomInsetPx(viewport, layoutHeight)}px`,
  };
}

/** Top edge for the bottom tab bar, aligned to the visual viewport bottom. */
export function bottomTabsTopPx(
  viewport: VisualViewportSnapshot | null,
  layoutHeight: number,
  tabsHeight: number
): number {
  const { offsetTop, height } = saneVisualViewport(viewport, layoutHeight);
  return offsetTop + height - tabsHeight;
}
