import { isNimiqPay, isNimiqPayUserAgent } from "./nimiqPay";

export type PayFullscreenOutcome = "entered" | "kept-chrome" | "outside";

export type PayFullscreenHost = {
  requestFullscreen?: () => Promise<void>;
};

const HOST_POLL_MS = 50;

export function createPayFullscreen(deps: {
  inPay: () => boolean;
  readHost: () => PayFullscreenHost | null;
  lockPortrait: () => Promise<void>;
  waitMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}): { enter(): Promise<PayFullscreenOutcome> } {
  let pending: Promise<PayFullscreenOutcome> | null = null;

  return {
    enter() {
      if (!pending) pending = attempt();
      return pending;
    },
  };

  async function attempt(): Promise<PayFullscreenOutcome> {
    const requestFullscreen = await waitForRequest();
    if (!requestFullscreen) return deps.inPay() ? "kept-chrome" : "outside";
    try {
      await requestFullscreen();
    } catch {
      return "kept-chrome";
    }
    try {
      await deps.lockPortrait();
    } catch {
      // Pay fullscreen stands when the host refuses a portrait lock.
    }
    return "entered";
  }

  async function waitForRequest(): Promise<(() => Promise<void>) | null> {
    const waitMs = deps.waitMs ?? 2_000;
    const sleep = deps.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
    const now = deps.now ?? Date.now;
    const started = now();
    for (;;) {
      if (deps.inPay()) {
        const requestFullscreen = deps.readHost()?.requestFullscreen;
        if (requestFullscreen) return requestFullscreen;
      }
      if (now() - started >= waitMs) return null;
      await sleep(HOST_POLL_MS);
    }
  }
}

function readPayFullscreenHost(): PayFullscreenHost | null {
  if (typeof window === "undefined") return null;
  const host = window.nimiqPay as { requestFullscreen?: unknown } | undefined;
  if (!host || typeof host.requestFullscreen !== "function") return null;
  const requestFullscreen = host.requestFullscreen.bind(host) as () => Promise<void>;
  return { requestFullscreen };
}

type PortraitLock = {
  lock?: (orientation: "portrait") => Promise<void>;
};

function lockPayPortrait(): Promise<void> {
  if (typeof screen === "undefined") return Promise.resolve();
  const orientation = screen.orientation as PortraitLock | undefined;
  const lock = orientation?.lock;
  if (!orientation || typeof lock !== "function") return Promise.resolve();
  return lock.call(orientation, "portrait");
}

const browserSession = createPayFullscreen({
  inPay: () => isNimiqPay() || isNimiqPayUserAgent(),
  readHost: readPayFullscreenHost,
  lockPortrait: lockPayPortrait,
});

/** One Pay fullscreen attempt for this open. Waits briefly for Pay to inject the host. A refusal or a drop is not retried. */
export function enterPayFullscreen(): Promise<PayFullscreenOutcome> {
  return browserSession.enter();
}
