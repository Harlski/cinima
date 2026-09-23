import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { appSettings } from "../db/schema.js";

const NIM_PAYOUTS_PAUSED_KEY = "nim_payouts_paused";

/** True when the Creator has paused Join grants, Rewards, and Pings. */
export async function nimPayoutsPaused(): Promise<boolean> {
  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, NIM_PAYOUTS_PAUSED_KEY))
    .limit(1);
  return row?.value === "1";
}

export async function setNimPayoutsPaused(paused: boolean): Promise<void> {
  const value = paused ? "1" : "0";
  await db
    .insert(appSettings)
    .values({ key: NIM_PAYOUTS_PAUSED_KEY, value })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value },
    });
}
