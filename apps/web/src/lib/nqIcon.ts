import nimiqIconsData from "nimiq-icons/icons.json";

const HEX_OUTLINE_ID = "logos-nimiq-hexagon-outline-mono";

export function nqHexOutlineSvg(opts?: {
  class?: string;
  width?: number;
  height?: number;
}): string {
  const ic = nimiqIconsData.icons[HEX_OUTLINE_ID];
  if (!ic?.body) {
    throw new Error(`[nqIcon] missing ${HEX_OUTLINE_ID}`);
  }
  const w = opts?.width ?? ic.width ?? 18;
  const h = opts?.height ?? ic.height ?? 17;
  const cls = ["nq-icon", opts?.class].filter(Boolean).join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="${cls}" aria-hidden="true" fill="none">${ic.body}</svg>`;
}
