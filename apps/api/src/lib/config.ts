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

function envCred(name: string): string {
  let s = envString(name).trim();
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/** Lazy env reads so dotenv (via `./load-env`) can run before values are consumed. */
export const config = {
  get port() {
    return Number(process.env.PORT || 8787);
  },
  get studioPort() {
    return Number(process.env.STUDIO_PORT || 8788);
  },
  /** Local `pnpm dev` binds Studio in-process. Docker API sets this to 0. */
  get studioInline() {
    return process.env.STUDIO_INLINE !== "0";
  },
  /** Docker DNS to the Studio container. Empty means this process does not forward Studio. */
  get studioUpstream() {
    return envString("STUDIO_UPSTREAM");
  },
  get senderPort() {
    return Number(process.env.SENDER_PORT || 8789);
  },
  /** Local `pnpm dev` drains Sends in-process. Docker API sets this to 0. */
  get senderInline() {
    return process.env.SENDER_INLINE !== "0";
  },
  get senderPrivateKey() {
    return envString("NIM_SENDER_PRIVATE_KEY");
  },
  get nimiqNetwork() {
    return envString("NIM_NETWORK", "mainalbatross");
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
  get tmdbTimeoutMs() {
    const n = Number(process.env.TMDB_TIMEOUT_MS || 4000);
    return Number.isFinite(n) && n > 0 ? n : 4000;
  },
  get webOrigin() {
    return canonicalWebOrigin(envString("WEB_ORIGIN", "http://localhost:5174"));
  },
  get apiOrigin() {
    return envString("API_ORIGIN", envString("VITE_API_BASE", "https://api.cinima.app"));
  },
  get telegramBotToken() {
    return envCred("TELEGRAM_BOT_TOKEN");
  },
  get telegramChatId() {
    return envCred("TELEGRAM_CHAT_ID");
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
