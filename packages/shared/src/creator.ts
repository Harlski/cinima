import { normalizeWallet } from "./memos.js";

/** Cinima Creator wallet. Studio and the guided tour both bind to this address. */
export const CREATOR_WALLET_DISPLAY =
  "NQ63 XN7E 020H H0RN RD6G 7QT1 Y7AM H1P5 H84B";

export const CREATOR_WALLET = normalizeWallet(CREATOR_WALLET_DISPLAY);

export function isCreatorWallet(wallet: string): boolean {
  return normalizeWallet(wallet) === CREATOR_WALLET;
}
