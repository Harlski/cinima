import {
  COMMENT_LUNA,
  COMMENT_NIM,
  LIFETIME_UNLOCK_LUNA,
  LIFETIME_UNLOCK_NIM,
  UNLOCK_LUNA,
  UNLOCK_NIM,
} from "@nimcharts/shared";

function envBool(name: string, fallback = false): boolean {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

export const config = {
  port: Number(process.env.PORT || 8787),
  demoMode: envBool("DEMO_MODE", true),
  sessionSecret: process.env.SESSION_SECRET || "dev-secret",
  treasuryAddress: process.env.TREASURY_ADDRESS || "NQ07 0000 0000 0000 0000 0000 0000 0000 0000",
  nimiqRpcUrl: process.env.NIMIQ_RPC_URL || "https://rpc.nimiqwatch.com",
  tmdbApiKey: process.env.TMDB_API_KEY || "",
  omdbApiKey: process.env.OMDB_API_KEY || "",
  nimConnectBaseUrl: (process.env.NIMCONNECT_BASE_URL || "https://nimconnect.nimiq.com").replace(/\/$/, ""),
  webOrigin: process.env.WEB_ORIGIN || "http://localhost:5173",
  prices: {
    unlockNim: UNLOCK_NIM,
    lifetimeNim: LIFETIME_UNLOCK_NIM,
    commentNim: COMMENT_NIM,
    unlockLuna: UNLOCK_LUNA,
    lifetimeLuna: LIFETIME_UNLOCK_LUNA,
    commentLuna: COMMENT_LUNA,
  },
};
