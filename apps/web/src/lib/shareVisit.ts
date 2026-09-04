import type { InjectionKey } from "vue";
import {
  shareVisitChannel,
  type ShareVisitIntent,
  type ShareVisitKind,
} from "@cinima/shared";
import { isNimiqPay } from "./nimiqPay";

export type ShareVisitBeacon = {
  kind: ShareVisitKind;
  code?: string;
  handle?: string;
};

export const shareVisitPayIntentKey: InjectionKey<() => void> = Symbol(
  "shareVisitPayIntent"
);

/** Best-effort unauthenticated Share visit beacon. Crawlers never run this. */
export function recordShareVisit(
  input: ShareVisitBeacon & { intent?: ShareVisitIntent }
): void {
  if (typeof fetch === "undefined") return;
  const apiBase = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
  const body = {
    kind: input.kind,
    channel: shareVisitChannel(isNimiqPay()),
    intent: input.intent ?? "open",
    ...(input.code ? { code: input.code } : {}),
    ...(input.handle ? { handle: input.handle } : {}),
  };
  void fetch(`${apiBase}/api/share-visits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    /* beacon is best-effort */
  });
}
