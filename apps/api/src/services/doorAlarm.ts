import { displayName } from "@cinima/shared";

export type DoorAlarmActor = {
  handle: string | null;
  walletAddress?: string;
};

export type DoorAlarmEvent =
  | ({ kind: "signed-in" } & DoorAlarmActor)
  | ({ kind: "searched"; query: string } & DoorAlarmActor)
  | ({ kind: "viewed"; title: string } & DoorAlarmActor)
  | ({ kind: "shared-title"; title: string } & DoorAlarmActor)
  | ({ kind: "shared-profile" } & DoorAlarmActor)
  | ({ kind: "shared-watchlist" } & DoorAlarmActor)
  | ({ kind: "share-visit" } & DoorAlarmActor);

export type DoorAlarmSender = {
  send(line: string): void | Promise<void>;
};

type DoorAlarmEnv = {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function doorAlarmLine(event: DoorAlarmEvent): string {
  const who = displayName(event.handle, event.walletAddress ?? "") || "someone";
  switch (event.kind) {
    case "signed-in":
      return `${who} signed in`;
    case "searched":
      return `${who} searched "${event.query}"`;
    case "viewed":
      return `${who} viewed ${event.title}`;
    case "shared-title":
      return `${who} shared ${event.title}`;
    case "shared-profile":
      return `${who} shared their profile`;
    case "shared-watchlist":
      return `${who} shared their Watchlist`;
    case "share-visit":
      return `${who}'s share was visited`;
  }
}

function silentDoorAlarmSender(): DoorAlarmSender {
  return {
    send() {},
  };
}

function telegramDoorAlarmSender(
  token: string,
  chatId: string,
  fetchImpl: FetchLike
): DoorAlarmSender {
  return {
    async send(line: string) {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: line }),
      });
      if (!res.ok) {
        throw new Error(`telegram_http_${res.status}`);
      }
    },
  };
}

export function doorAlarmSenderFromEnv(
  env: DoorAlarmEnv = process.env,
  fetchImpl: FetchLike = fetch
): DoorAlarmSender {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return silentDoorAlarmSender();
  return telegramDoorAlarmSender(token, chatId, fetchImpl);
}

let currentSender: DoorAlarmSender = doorAlarmSenderFromEnv();

export function setDoorAlarmSender(sender: DoorAlarmSender): void {
  currentSender = sender;
}

export function resetDoorAlarmSender(): void {
  currentSender = doorAlarmSenderFromEnv();
}

export function ringDoorAlarm(event: DoorAlarmEvent): void {
  try {
    const line = doorAlarmLine(event);
    const result = currentSender.send(line);
    if (result != null && typeof result.then === "function") {
      void result.catch((err: unknown) => {
        console.warn("[door-alarm] send failed", err);
      });
    }
  } catch (err) {
    console.warn("[door-alarm] send failed", err);
  }
}

/** Call after a Share visit is recorded. */
export function ringShareVisitDoorAlarm(actor: DoorAlarmActor): void {
  ringDoorAlarm({ kind: "share-visit", ...actor });
}
