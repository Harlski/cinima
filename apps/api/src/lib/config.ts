import {
  COMMENT_LUNA,
  COMMENT_NIM,
  LIFETIME_UNLOCK_LUNA,
  LIFETIME_UNLOCK_NIM,
  UNLOCK_LUNA,
  UNLOCK_NIM,
  canonicalWebOrigin,
} from "@cinima/shared";

function envBool(name: string, fallback = false): boolean {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

function envString(name: string, fallback = ""): string {
  return process.env[name] || fallback;
}

/** Lazy env reads so dotenv (via `./load-env`) can run before values are consumed. */
export const config = {
  get port() {
    return Number(process.env.PORT || 8787);
  },
  get demoMode() {
    return envBool("DEMO_MODE", true);
  },
  get sessionSecret() {
    return envString("SESSION_SECRET", "dev-secret");
  },
  get treasuryAddress() {
    return envString("TREASURY_ADDRESS", "NQ07 0000 0000 0000 0000 0000 0000 0000 0000");
  },
  get nimiqRpcUrl() {
    return envString("NIMIQ_RPC_URL", "https://rpc.nimiqwatch.com");
  },
  get tmdbApiKey() {
    return envString("TMDB_API_KEY");
  },
  get webOrigin() {
    return canonicalWebOrigin(envString("WEB_ORIGIN", "http://localhost:5174"));
  },
  get apiOrigin() {
    return envString("API_ORIGIN", envString("VITE_API_BASE", "https://api.cinima.app"));
  },
  prices: {
    unlockNim: UNLOCK_NIM,
    lifetimeNim: LIFETIME_UNLOCK_NIM,
    commentNim: COMMENT_NIM,
    unlockLuna: UNLOCK_LUNA,
    lifetimeLuna: LIFETIME_UNLOCK_LUNA,
    commentLuna: COMMENT_LUNA,
  },
};
