const KEYBOARD_OVERLAP_THRESHOLD_PX = 48;

export type VisualViewportBox = {
  offsetTop: number;
  height: number;
};

export type SearchChrome = {
  layoutHeight: number;
  headerHeight: number;
  tabsHeight: number;
  dockHeight: number;
};

function keyboardOverlapPx(
  layoutHeight: number,
  viewport: VisualViewportBox | null
): number {
  if (!viewport) return 0;
  return Math.max(0, layoutHeight - (viewport.offsetTop + viewport.height));
}

export function searchDockBottomPx(
  chrome: SearchChrome,
  viewport: VisualViewportBox | null
): number {
  const overlap = keyboardOverlapPx(chrome.layoutHeight, viewport);
  return overlap > KEYBOARD_OVERLAP_THRESHOLD_PX ? overlap : chrome.tabsHeight;
}

export function searchStageBox(
  chrome: SearchChrome,
  viewport: VisualViewportBox | null
): { top: number; height: number } {
  const dockBottom = searchDockBottomPx(chrome, viewport);
  const dockTop = chrome.layoutHeight - dockBottom - chrome.dockHeight;
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportBottom = viewport
    ? viewport.offsetTop + viewport.height
    : chrome.layoutHeight;
  const top = Math.max(viewportTop, chrome.headerHeight);
  const bottom = Math.min(dockTop, viewportBottom);
  return { top, height: Math.max(0, bottom - top) };
}
