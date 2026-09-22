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
  | ({ kind: "share-visit" } & DoorAlarmActor)
  | ({ kind: "favorited"; title: string } & DoorAlarmActor)
  | ({ kind: "recommended"; title: string } & DoorAlarmActor)
  | ({ kind: "watchlisted"; title: string } & DoorAlarmActor)
  | ({ kind: "left-watchlist"; title: string } & DoorAlarmActor)
  | ({ kind: "commented"; title: string } & DoorAlarmActor)
  | ({ kind: "thanked"; title: string } & DoorAlarmActor)
  | ({ kind: "comment-thanked"; title: string } & DoorAlarmActor)
  | ({ kind: "guestbook-thanked"; note: string } & DoorAlarmActor)
  | ({ kind: "thanked-all"; title: string } & DoorAlarmActor)
  | ({ kind: "followed"; followee: string } & DoorAlarmActor)
  | ({ kind: "set-handle" } & DoorAlarmActor)
  | ({ kind: "tour-completed" } & DoorAlarmActor)
  | ({ kind: "tour-skipped" } & DoorAlarmActor)
  | ({ kind: "sent-reward"; memo: string } & DoorAlarmActor)
  | ({ kind: "sent-ping"; memo: string } & DoorAlarmActor)
  | ({ kind: "sent-join"; memo: string } & DoorAlarmActor)
  | ({
      kind: "user-send-failed";
      surface: "title" | "comment" | "guestbook";
      target: string;
      detail: string;
    } & DoorAlarmActor);

export type DoorAlarmSender = {
  send(line: string): void | Promise<void>;
};

type DoorAlarmEnv = {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function trimTelegramCred(v?: string): string {
  let s = (v ?? "").trim();
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export function doorAlarmStatus(env: DoorAlarmEnv = process.env): "armed" | "silent" {
  const token = trimTelegramCred(env.TELEGRAM_BOT_TOKEN);
  const chatId = trimTelegramCred(env.TELEGRAM_CHAT_ID);
  return token && chatId ? "armed" : "silent";
}

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
    case "favorited":
      return `${who} Favorited ${event.title}`;
    case "recommended":
      return `${who} Recommended ${event.title}`;
    case "watchlisted":
      return `${who} added ${event.title} to Watchlist`;
    case "left-watchlist":
      return `${who} left ${event.title} on Watchlist`;
    case "commented":
      return `${who} commented on ${event.title}`;
    case "thanked":
      return `${who} sent Thanks for ${event.title}`;
    case "comment-thanked":
      return `${who} sent Comment Thanks on ${event.title}`;
    case "guestbook-thanked":
      return `${who} sent Guestbook thanks: ${event.note}`;
    case "thanked-all":
      return `${who} thanked all on ${event.title}`;
    case "followed":
      return `${who} followed ${event.followee}`;
    case "set-handle":
      return `${who} set their Handle`;
    case "tour-completed":
      return `${who} finished the Guided tour`;
    case "tour-skipped":
      return `${who} skipped the Guided tour`;
    case "sent-reward":
      return `Reward sent to ${who}`;
    case "sent-ping":
      return `Ping sent to ${who}: ${event.memo}`;
    case "sent-join":
      return `Join grant sent to ${who}`;
    case "user-send-failed": {
      const during =
        event.surface === "comment"
          ? "Comment Thanks"
          : event.surface === "guestbook"
            ? "Guestbook thanks"
            : "Thanks";
      const to = event.target ? ` to ${event.target}` : "";
      return `${who}'s User Send failed during ${during}${to}: ${event.detail}`;
    }
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
  const token = trimTelegramCred(env.TELEGRAM_BOT_TOKEN);
  const chatId = trimTelegramCred(env.TELEGRAM_CHAT_ID);
  if (!token || !chatId) return silentDoorAlarmSender();
  return telegramDoorAlarmSender(token, chatId, fetchImpl);
}

let injectedSender: DoorAlarmSender | null = null;

export function setDoorAlarmSender(sender: DoorAlarmSender): void {
  injectedSender = sender;
}

export function resetDoorAlarmSender(): void {
  injectedSender = null;
}

function activeSender(): DoorAlarmSender {
  return injectedSender ?? doorAlarmSenderFromEnv();
}

export function ringDoorAlarm(event: DoorAlarmEvent): void {
  try {
    const line = doorAlarmLine(event);
    const result = activeSender().send(line);
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
