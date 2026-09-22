import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { PAY_CANCELLED_MESSAGE, PAY_FAILED_MESSAGE } from "../src/lib/nimiqPay";
import { useUserSendStore } from "../src/stores/userSend";

const { request, pay } = vi.hoisted(() => ({
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
  pay: {
    demo: true,
    inPay: false,
    send: vi.fn(async () => "hash"),
  },
}));

vi.mock("@/composables/useApi", () => ({
  useApi: () => ({ request }),
}));

vi.mock("@/lib/nimiqPay", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/nimiqPay")>();
  return {
    ...actual,
    demoEnabledOutsidePay: () => pay.demo,
    isNimiqPay: () => pay.inPay,
    sendPayTransaction: (opts: unknown) => pay.send(opts),
  };
});

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
    pay.demo = true;
    pay.inPay = false;
    pay.send.mockReset();
    pay.send.mockResolvedValue("hash");
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

  it("keeps profile-only notes on Guestbook thanks", () => {
    const send = useUserSendStore();
    send.offer(TITLE);
    send.selectNote("cinema-with-you");
    expect(send.noteId).toBe("thanks");

    send.offer({
      kind: "guestbook",
      toWallet: "NQ05PEERGUEST",
      handle: "ada",
    });
    expect(send.noteId).toBe("great-taste");
    send.selectNote("cinema-with-you");
    expect(send.noteId).toBe("cinema-with-you");
    send.selectNote("thanks");
    expect(send.noteId).toBe("cinema-with-you");
  });

  it("shows Oops and reports the host error when Pay fails", async () => {
    pay.demo = false;
    pay.inPay = true;
    pay.send.mockRejectedValue(new Error("Insufficient funds"));
    const send = useUserSendStore();
    send.offer(TITLE);
    send.selectNote("thanks-rec");

    await expect(send.confirm()).resolves.toBe(false);

    expect(send.error).toBe(PAY_FAILED_MESSAGE);
    expect(send.pending).toEqual(TITLE);
    const report = request.mock.calls.find(([path]) => path === "/user-sends/failure");
    expect(report?.[1]).toMatchObject({ method: "POST" });
    expect(JSON.parse(String(report?.[1]?.body))).toEqual({
      kind: "title",
      target: "nic",
      detail: "Insufficient funds",
    });
  });

  it("shows Cancelled and does not report a dismissed Pay sheet", async () => {
    pay.demo = false;
    pay.inPay = true;
    pay.send.mockRejectedValue(new Error("User cancelled"));
    const send = useUserSendStore();
    send.offer(TITLE);
    send.selectNote("thanks-rec");

    await expect(send.confirm()).resolves.toBe(false);

    expect(send.error).toBe(PAY_CANCELLED_MESSAGE);
    expect(request.mock.calls.some(([path]) => path === "/user-sends/failure")).toBe(false);
  });

  it("skips Thanks in Cue lab preview", async () => {
    const send = useUserSendStore();
    send.offer(TITLE, { preview: true });
    await send.confirm();
    expect(request).not.toHaveBeenCalled();
    expect(send.lastThanked).toBeNull();
  });
});
