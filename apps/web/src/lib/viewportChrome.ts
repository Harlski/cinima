export type VisualViewportSnapshot = {
  offsetTop: number;
  height: number;
};

export function visualViewportBottomInsetPx(
  viewport: VisualViewportSnapshot | null,
  layoutHeight: number
): number {
  const offsetTop = viewport?.offsetTop ?? 0;
  const height = viewport?.height ?? layoutHeight;
  return Math.max(0, layoutHeight - (offsetTop + height));
}

/** CSS custom properties that pin fixed chrome to the visual viewport. */
export function viewportChromeCssVars(
  viewport: VisualViewportSnapshot | null,
  layoutHeight: number
): Record<"--vv-offset-top" | "--vv-height" | "--vv-bottom-inset", string> {
  const offsetTop = viewport?.offsetTop ?? 0;
  const height = viewport?.height ?? layoutHeight;
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
  const offsetTop = viewport?.offsetTop ?? 0;
  const height = viewport?.height ?? layoutHeight;
  return offsetTop + height - tabsHeight;
}
