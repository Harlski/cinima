import { afterEach, describe, expect, it } from "vitest";
import {
  doorAlarmLine,
  doorAlarmSenderFromEnv,
  doorAlarmStatus,
  resetDoorAlarmSender,
  ringDoorAlarm,
  ringShareVisitDoorAlarm,
  setDoorAlarmSender,
} from "../src/services/doorAlarm.js";

describe("Door alarm copy", () => {
  it("names a Handle and a search query", () => {
    expect(
      doorAlarmLine({
        kind: "searched",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
        query: "dune",
      })
    ).toBe('alice searched "dune"');
  });

  it("uses a truncated wallet when the Handle is missing", () => {
    expect(
      doorAlarmLine({
        kind: "signed-in",
        handle: null,
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
      })
    ).toBe("NQ05..0001 signed in");
  });

  it("announces a Handle sign-in", () => {
    expect(
      doorAlarmLine({
        kind: "signed-in",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
      })
    ).toBe("alice signed in");
  });

  it("names a title view", () => {
    expect(
      doorAlarmLine({
        kind: "viewed",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
        title: "Fight Club",
      })
    ).toBe("alice viewed Fight Club");
  });

  it("names a Title Share create", () => {
    expect(
      doorAlarmLine({
        kind: "shared-title",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
        title: "Fight Club",
      })
    ).toBe("alice shared Fight Club");
  });

  it("names a Public Profile share create", () => {
    expect(
      doorAlarmLine({
        kind: "shared-profile",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
      })
    ).toBe("alice shared their profile");
  });

  it("names a Watchlist Share create", () => {
    expect(
      doorAlarmLine({
        kind: "shared-watchlist",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
      })
    ).toBe("alice shared their Watchlist");
  });

  it("names a Share visit", () => {
    expect(
      doorAlarmLine({
        kind: "share-visit",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
      })
    ).toBe("alice's share was visited");
  });

  it("names an anonymous Share visit", () => {
    expect(
      doorAlarmLine({
        kind: "share-visit",
        handle: null,
      })
    ).toBe("someone's share was visited");
  });

  it("names a Favorite", () => {
    expect(
      doorAlarmLine({
        kind: "favorited",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
        title: "Fight Club",
      })
    ).toBe("alice Favorited Fight Club");
  });

  it("names a Recommend", () => {
    expect(
      doorAlarmLine({
        kind: "recommended",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
        title: "Fight Club",
      })
    ).toBe("alice Recommended Fight Club");
  });

  it("names a Watchlist add", () => {
    expect(
      doorAlarmLine({
        kind: "watchlisted",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
        title: "Fight Club",
      })
    ).toBe("alice added Fight Club to Watchlist");
  });

  it("names a Watchlist leave", () => {
    expect(
      doorAlarmLine({
        kind: "left-watchlist",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
        title: "Fight Club",
      })
    ).toBe("alice left Fight Club on Watchlist");
  });

  it("names a Comment", () => {
    expect(
      doorAlarmLine({
        kind: "commented",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
        title: "Fight Club",
      })
    ).toBe("alice commented on Fight Club");
  });

  it("names Thanks", () => {
    expect(
      doorAlarmLine({
        kind: "thanked",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
        title: "Fight Club",
      })
    ).toBe("alice sent Thanks for Fight Club");
  });

  it("names Comment Thanks", () => {
    expect(
      doorAlarmLine({
        kind: "comment-thanked",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
        title: "Fight Club",
      })
    ).toBe("alice sent Comment Thanks on Fight Club");
  });

  it("names Thank all", () => {
    expect(
      doorAlarmLine({
        kind: "thanked-all",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
        title: "Fight Club",
      })
    ).toBe("alice thanked all on Fight Club");
  });

  it("names a Follow", () => {
    expect(
      doorAlarmLine({
        kind: "followed",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
        followee: "bob",
      })
    ).toBe("alice followed bob");
  });

  it("names a Handle set", () => {
    expect(
      doorAlarmLine({
        kind: "set-handle",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
      })
    ).toBe("alice set their Handle");
  });

  it("names Guided tour complete and skip", () => {
    expect(
      doorAlarmLine({
        kind: "tour-completed",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
      })
    ).toBe("alice finished the Guided tour");
    expect(
      doorAlarmLine({
        kind: "tour-skipped",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
      })
    ).toBe("alice skipped the Guided tour");
  });
});

describe("Door alarm sender", () => {
  afterEach(() => {
    resetDoorAlarmSender();
  });

  it("is a silent no-op when Telegram env is unset", async () => {
    const fetches: string[] = [];
    const sender = doorAlarmSenderFromEnv(
      {},
      async (url) => {
        fetches.push(String(url));
        return new Response("ok");
      }
    );
    await sender.send('alice searched "dune"');
    expect(fetches).toEqual([]);
  });

  it("posts one Telegram line when token and chat id are set", async () => {
    const fetches: { url: string; body: unknown }[] = [];
    const sender = doorAlarmSenderFromEnv(
      { TELEGRAM_BOT_TOKEN: "tok", TELEGRAM_CHAT_ID: "123" },
      async (url, init) => {
        fetches.push({
          url: String(url),
          body: JSON.parse(String(init?.body ?? "{}")),
        });
        return new Response("ok");
      }
    );
    await sender.send('alice searched "dune"');
    expect(fetches).toEqual([
      {
        url: "https://api.telegram.org/bottok/sendMessage",
        body: { chat_id: "123", text: 'alice searched "dune"' },
      },
    ]);
  });

  it("strips quotes from Telegram env", async () => {
    const fetches: { url: string; body: unknown }[] = [];
    const sender = doorAlarmSenderFromEnv(
      { TELEGRAM_BOT_TOKEN: '"tok"', TELEGRAM_CHAT_ID: "'-123'" },
      async (url, init) => {
        fetches.push({
          url: String(url),
          body: JSON.parse(String(init?.body ?? "{}")),
        });
        return new Response("ok");
      }
    );
    await sender.send("ping");
    expect(fetches).toEqual([
      {
        url: "https://api.telegram.org/bottok/sendMessage",
        body: { chat_id: "-123", text: "ping" },
      },
    ]);
  });

  it("reports armed vs silent from env", () => {
    expect(doorAlarmStatus({})).toBe("silent");
    expect(doorAlarmStatus({ TELEGRAM_BOT_TOKEN: "tok", TELEGRAM_CHAT_ID: "1" })).toBe(
      "armed"
    );
  });

  it("lets tests inject a capturing sender", () => {
    const lines: string[] = [];
    setDoorAlarmSender({
      send(line) {
        lines.push(line);
      },
    });
    ringDoorAlarm({
      kind: "searched",
      handle: "alice",
      walletAddress: "NQ05USAGETESTWALLET000000000000001",
      query: "dune",
    });
    expect(lines).toEqual(['alice searched "dune"']);
  });

  it("exposes Share visit as a function ready to call", () => {
    const lines: string[] = [];
    setDoorAlarmSender({
      send(line) {
        lines.push(line);
      },
    });
    ringShareVisitDoorAlarm({
      handle: "alice",
      walletAddress: "NQ05USAGETESTWALLET000000000000001",
    });
    expect(lines).toEqual(["alice's share was visited"]);
  });

  it("swallows a throwing sender so the write path stays up", () => {
    setDoorAlarmSender({
      send() {
        throw new Error("telegram down");
      },
    });
    expect(() =>
      ringDoorAlarm({
        kind: "signed-in",
        handle: "alice",
        walletAddress: "NQ05USAGETESTWALLET000000000000001",
      })
    ).not.toThrow();
  });
});
