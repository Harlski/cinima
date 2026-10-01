import { afterEach, describe, expect, it, vi } from "vitest";
import { createPayFullscreen, enterPayFullscreen } from "../src/lib/payFullscreen";

describe("Pay fullscreen", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not request fullscreen outside Nimiq Pay", async () => {
    const requestFullscreen = vi.fn();
    const lockPortrait = vi.fn();
    const session = createPayFullscreen({
      inPay: () => false,
      readHost: () => ({ requestFullscreen }),
      lockPortrait,
      waitMs: 0,
    });

    await expect(session.enter()).resolves.toBe("outside");
    expect(requestFullscreen).not.toHaveBeenCalled();
    expect(lockPortrait).not.toHaveBeenCalled();
  });

  it("asks once when Nimiq Pay appears after the page opens", async () => {
    const requestFullscreen = vi.fn(async () => {});
    const lockPortrait = vi.fn(async () => {});
    let inPay = false;
    let host: { requestFullscreen?: () => Promise<void> } | null = null;
    let clock = 0;
    const session = createPayFullscreen({
      inPay: () => inPay,
      readHost: () => host,
      lockPortrait,
      waitMs: 200,
      sleep: async (ms) => {
        clock += ms;
        inPay = true;
        host = { requestFullscreen };
      },
      now: () => clock,
    });

    await expect(session.enter()).resolves.toBe("entered");
    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(lockPortrait).toHaveBeenCalledOnce();
  });

  it("enters fullscreen and locks portrait inside Nimiq Pay", async () => {
    const requestFullscreen = vi.fn(async () => {});
    const lockPortrait = vi.fn(async () => {});
    const session = createPayFullscreen({
      inPay: () => true,
      readHost: () => ({ requestFullscreen }),
      lockPortrait,
    });

    await expect(session.enter()).resolves.toBe("entered");
    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(lockPortrait).toHaveBeenCalledOnce();
  });

  it("keeps Pay chrome when fullscreen is refused and does not ask again", async () => {
    const requestFullscreen = vi.fn(async () => {
      throw new Error("unavailable");
    });
    const lockPortrait = vi.fn(async () => {});
    const session = createPayFullscreen({
      inPay: () => true,
      readHost: () => ({ requestFullscreen }),
      lockPortrait,
    });

    await expect(session.enter()).resolves.toBe("kept-chrome");
    await expect(session.enter()).resolves.toBe("kept-chrome");
    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(lockPortrait).not.toHaveBeenCalled();
  });

  it("stays in Pay fullscreen when portrait lock is refused", async () => {
    const requestFullscreen = vi.fn(async () => {});
    const lockPortrait = vi.fn(async () => {
      throw new Error("orientation lock unavailable");
    });
    const session = createPayFullscreen({
      inPay: () => true,
      readHost: () => ({ requestFullscreen }),
      lockPortrait,
    });

    await expect(session.enter()).resolves.toBe("entered");
    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(lockPortrait).toHaveBeenCalledOnce();
  });

  it("asks once when fullscreen arrives after Pay opens", async () => {
    const requestFullscreen = vi.fn(async () => {});
    const lockPortrait = vi.fn(async () => {});
    let host: { requestFullscreen?: () => Promise<void> } | null = null;
    let clock = 0;
    const session = createPayFullscreen({
      inPay: () => true,
      readHost: () => host,
      lockPortrait,
      waitMs: 100,
      sleep: async (ms) => {
        clock += ms;
        host = { requestFullscreen };
      },
      now: () => clock,
    });

    await expect(session.enter()).resolves.toBe("entered");
    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(lockPortrait).toHaveBeenCalledOnce();
  });

  it("keeps Pay chrome when the host never offers fullscreen", async () => {
    let clock = 0;
    const sleeps: number[] = [];
    const session = createPayFullscreen({
      inPay: () => true,
      readHost: () => null,
      lockPortrait: async () => {},
      waitMs: 100,
      sleep: async (ms) => {
        sleeps.push(ms);
        clock += ms;
      },
      now: () => clock,
    });

    await expect(session.enter()).resolves.toBe("kept-chrome");
    const waited = sleeps.length;
    expect(waited).toBeGreaterThan(0);
    await expect(session.enter()).resolves.toBe("kept-chrome");
    expect(sleeps).toHaveLength(waited);
  });

  it("asks Nimiq Pay for fullscreen when Cinima opens inside Pay", async () => {
    const requestFullscreen = vi.fn(async () => {});
    const lock = vi.fn(async () => {});
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 NimiqPay/3.0" });
    vi.stubGlobal("screen", { orientation: { lock } });
    vi.stubGlobal("window", { nimiqPay: { requestFullscreen } });

    await expect(enterPayFullscreen()).resolves.toBe("entered");
    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(lock).toHaveBeenCalledWith("portrait");
  });
});
