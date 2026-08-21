import nimiqIconsData from "nimiq-icons/icons.json";

export type NqIconName = string;

export function nqIconMeta(name: NqIconName): {
  body: string;
  width: number;
  height: number;
} {
  const ic = nimiqIconsData.icons[name];
  if (!ic?.body) {
    throw new Error(`[nqIcon] missing ${name}`);
  }
  const width = ic.width ?? ic.height ?? 12;
  const height = ic.height ?? ic.width ?? 12;
  return { body: ic.body, width, height };
}
