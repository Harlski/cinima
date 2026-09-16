import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useUserSendStore } from "../src/stores/userSend";

const { request } = vi.hoisted(() => ({
  request: vi.fn(async (path: string) => {
    if (String(path).includes("/thanks") && !String(path).includes("/send")) {
      return { created: true, earnedAchievements: ["bravo"] };
    }
    if (String(path).includes("/comments/") && String(path).endsWith("/thanks")) {
      return {
        created: true,
        comment: { id: 7, thanksCount: 1, thanked: true, sent: false },
        earnedAchievements: ["bravo"],
      };
    }
    return { ok: true, sent: true };
  }),
}));

vi.mock("@/composables/useApi", () => ({
  useApi: () => ({ request }),
}));

vi.mock("@/lib/nimiqPay", () => ({
  demoEnabledOutsidePay: () => true,
  isNimiqPay: () => false,
  payUserMessage: (err: unknown) => (err instanceof Error ? err.message : "Send failed"),
  sendPayTransaction: vi.fn(),
}));

const COMMENT = {
  kind: "comment" as const,
  toWallet: "NQ05PEERCOMMENT",
  handle: "ada",
  commentId: 7,
};

const TITLE = {
  kind: "title" as const,
  toWallet: "NQ05PEERTITLE",
  handle: "nic",
  titleId: "tmdb:movie:550",
};

describe("Send Custom Message", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    });
    setActivePinia(createPinia());
    request.mockClear();
  });

  it("opens without sending Thanks", () => {
    const send = useUserSendStore();
    send.offer(COMMENT);
    expect(send.pending).toEqual(COMMENT);
    expect(request).not.toHaveBeenCalled();
  });

  it("lands Comment Thanks when they confirm the Free Thanks note", async () => {
    const send = useUserSendStore();
    send.offer(COMMENT);
    send.selectNote("thanks");

    await expect(send.confirm()).resolves.toBe(true);

    expect(request).toHaveBeenCalledWith("/comments/7/thanks", { method: "POST" });
    expect(send.lastThanked).toEqual(COMMENT);
    expect(send.pending).toBeNull();
    expect(send.lastAttached).toBeNull();
    expect(
      request.mock.calls.some(([path]) => String(path).includes("/thanks/send"))
    ).toBe(false);
  });

  it("does not send Thanks when they choose Not now", () => {
    const send = useUserSendStore();
    send.offer(TITLE);
    send.cancel();
    expect(send.pending).toBeNull();
    expect(send.lastThanked).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it("lands title Thanks then a User Send for a paid note", async () => {
    const send = useUserSendStore();
    send.offer(TITLE);
    send.selectNote("thanks-rec");

    await expect(send.confirm()).resolves.toBe(true);

    expect(request.mock.calls[0]?.[0]).toBe("/thanks");
    expect(request.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
    expect(send.lastThanked).toEqual(TITLE);
    expect(send.lastAttached).toEqual(TITLE);
    expect(request.mock.calls.some(([path]) => path === "/thanks/send")).toBe(true);
  });

  it("skips Thanks in Cue lab preview", async () => {
    const send = useUserSendStore();
    send.offer(TITLE, { preview: true });
    await send.confirm();
    expect(request).not.toHaveBeenCalled();
    expect(send.lastThanked).toBeNull();
  });
});
