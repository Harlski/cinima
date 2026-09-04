import {
  isShareVisitChannel,
  isShareVisitKind,
  isShareVisitCrawler,
  shareVisitIntent,
  type ShareVisitChannel,
  type ShareVisitIntent,
  type ShareVisitKind,
} from "@cinima/shared";
import { db } from "../db/index.js";
import { shareVisits } from "../db/schema.js";

const HANDLE_MAX = 32;
const CODE_MAX = 12;

export type RecordShareVisitInput = {
  kind?: unknown;
  code?: unknown;
  handle?: unknown;
  channel?: unknown;
  intent?: unknown;
};

export type RecordShareVisitResult =
  | { recorded: true; kind: ShareVisitKind; channel: ShareVisitChannel; intent: ShareVisitIntent }
  | { recorded: false; reason: "invalid_body" | "crawler" };

function cleanOptional(raw: unknown, max: number): string | null {
  if (raw == null) return null;
  const value = String(raw)
    .trim()
    .toLowerCase()
    .slice(0, max);
  return value || null;
}

export async function recordShareVisit(
  input: RecordShareVisitInput,
  userAgent = "",
  atMs = Date.now()
): Promise<RecordShareVisitResult> {
  if (isShareVisitCrawler(userAgent)) {
    return { recorded: false, reason: "crawler" };
  }
  if (!isShareVisitKind(input.kind) || !isShareVisitChannel(input.channel)) {
    return { recorded: false, reason: "invalid_body" };
  }

  const kind = input.kind;
  const channel = input.channel;
  const intent = shareVisitIntent(typeof input.intent === "string" ? input.intent : null);
  const code = cleanOptional(input.code, CODE_MAX);
  const handle = cleanOptional(input.handle, HANDLE_MAX);

  await db.insert(shareVisits).values({
    kind,
    code,
    handle,
    channel,
    intent,
    createdAt: new Date(atMs),
  });
  return { recorded: true, kind, channel, intent };
}
