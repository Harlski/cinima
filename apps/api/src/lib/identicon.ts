import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";
import { formatWallet } from "@cinima/shared";

const require = createRequire(import.meta.url);
const Identicons = require("@nimiq/identicons").default as {
  svg(text: string): Promise<string>;
};

/** Rasterize the same Nimiq Identicon the app shows for a wallet. */
export async function identiconPng(walletAddress: string, size: number): Promise<Buffer> {
  const formatted = formatWallet(walletAddress);
  if (!formatted) {
    throw new Error("identicon_wallet_required");
  }
  const svg = await Identicons.svg(formatted);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    font: { loadSystemFonts: false },
  });
  return Buffer.from(resvg.render().asPng());
}
