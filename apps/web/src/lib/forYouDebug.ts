/** Temporary For You on-device debug. Prefix: [DEBUG-fy]. Remove after the empty-set hunt. */

export const FOR_YOU_DEBUG_STORAGE_KEY = "cinima.debug.fy";
export const FOR_YOU_DEBUG_QUERY = "debug";

const MAX_LOGS = 40;

export type ForYouDebugLog = {
  t: number;
  msg: string;
};

export type ForYouDebugDump = {
  at: string;
  href: string;
  inPay: boolean;
  ua: string;
  inner: { w: number; h: number };
  visual: { offsetTop: number; height: number; width: number } | null;
  vvCss: {
    offsetTop: string;
    height: string;
    bottomInset: string;
  };
  discover: {
    mode: string | null;
    tab: string | null;
    n: string | null;
    loading: string | null;
    handle: string | null;
  };
  motion: {
    pending: number[];
    fizzles: number;
    refills: number;
  };
  slots: Array<{
    index: string;
    opacity: string;
    top: number;
    left: number;
    w: number;
    h: number;
    pendingClass: boolean;
  }>;
  selected: {
    opacity: string;
    top: number;
    left: number;
    w: number;
    h: number;
    pendingClass: boolean;
  } | null;
  picker: { top: number; left: number; w: number; h: number } | null;
  logs: string[];
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const logs: ForYouDebugLog[] = [];
const listeners = new Set<() => void>();
let logging = false;

function emit() {
  for (const listener of listeners) listener();
}

function storage(): StorageLike | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

export function isForYouDebugQuery(query: { debug?: unknown }): boolean {
  const raw = query.debug;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "1" || value === "fy" || value === "for-you";
}

export function isForYouDebugEnabled(store: StorageLike | null = storage()): boolean {
  return store?.getItem(FOR_YOU_DEBUG_STORAGE_KEY) === "1";
}

export function setForYouDebugEnabled(
  on: boolean,
  store: StorageLike | null = storage()
): void {
  if (!store) return;
  const current = store.getItem(FOR_YOU_DEBUG_STORAGE_KEY) === "1";
  if (current === on) return;
  if (on) store.setItem(FOR_YOU_DEBUG_STORAGE_KEY, "1");
  else store.removeItem(FOR_YOU_DEBUG_STORAGE_KEY);
  emit();
}

export function toggleForYouDebug(store: StorageLike | null = storage()): boolean {
  const next = !isForYouDebugEnabled(store);
  setForYouDebugEnabled(next, store);
  forYouDebugLog(next ? "debug on" : "debug off");
  return next;
}

export function syncForYouDebugFromQuery(
  query: { debug?: unknown },
  store: StorageLike | null = storage()
): boolean {
  if (isForYouDebugQuery(query)) setForYouDebugEnabled(true, store);
  return isForYouDebugEnabled(store);
}

export function forYouDebugLog(msg: string): void {
  if (logging) return;
  logging = true;
  try {
    logs.push({ t: Date.now(), msg });
    if (logs.length > MAX_LOGS) logs.shift();
    if (typeof console !== "undefined") console.info(`[DEBUG-fy] ${msg}`);
    emit();
  } finally {
    logging = false;
  }
}

export function forYouDebugLogs(): ForYouDebugLog[] {
  return [...logs];
}

export function subscribeForYouDebug(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function box(el: Element | null): { top: number; left: number; w: number; h: number } | null {
  if (!el || !("getBoundingClientRect" in el)) return null;
  const r = el.getBoundingClientRect();
  return {
    top: Math.round(r.top),
    left: Math.round(r.left),
    w: Math.round(r.width),
    h: Math.round(r.height),
  };
}

export function captureForYouDebugSnapshot(input: {
  href?: string;
  inPay?: boolean;
  ua?: string;
  motion?: { pending: number[]; fizzles: number; refills: number };
  doc?: Document;
  win?: Window;
}): ForYouDebugDump {
  const doc = input.doc ?? (typeof document !== "undefined" ? document : undefined);
  const win = input.win ?? (typeof window !== "undefined" ? window : undefined);
  const root = doc?.documentElement;
  const discover = doc?.querySelector(".discover");
  const vv = win?.visualViewport;
  const slots = doc
    ? [...doc.querySelectorAll("[data-for-you-slot]")]
    : [];
  const selectedEl = doc?.querySelector(".poster.poster-press") ?? null;

  return {
    at: new Date().toISOString(),
    href: input.href ?? win?.location.href ?? "",
    inPay: input.inPay ?? false,
    ua: input.ua ?? win?.navigator.userAgent ?? "",
    inner: {
      w: win?.innerWidth ?? 0,
      h: win?.innerHeight ?? 0,
    },
    visual: vv
      ? {
          offsetTop: Math.round(vv.offsetTop),
          height: Math.round(vv.height),
          width: Math.round(vv.width),
        }
      : null,
    vvCss: {
      offsetTop: root?.style.getPropertyValue("--vv-offset-top") ?? "",
      height: root?.style.getPropertyValue("--vv-height") ?? "",
      bottomInset: root?.style.getPropertyValue("--vv-bottom-inset") ?? "",
    },
    discover: {
      mode: discover?.getAttribute("data-fy-mode") ?? null,
      tab: discover?.getAttribute("data-fy-tab") ?? null,
      n: discover?.getAttribute("data-fy-n") ?? null,
      loading: discover?.getAttribute("data-fy-loading") ?? null,
      handle: discover?.getAttribute("data-fy-handle") ?? null,
    },
    motion: input.motion ?? { pending: [], fizzles: 0, refills: 0 },
    slots: slots.map((el) => {
      const poster = el.querySelector(".strip-poster");
      const r = box(el) ?? { top: 0, left: 0, w: 0, h: 0 };
      return {
        index: el.getAttribute("data-for-you-slot") ?? "",
        opacity: poster ? getComputedStyle(poster).opacity : "",
        top: r.top,
        left: r.left,
        w: r.w,
        h: r.h,
        pendingClass: Boolean(poster?.classList.contains("strip-poster--refill-pending")),
      };
    }),
    selected: selectedEl
      ? {
          opacity: getComputedStyle(selectedEl).opacity,
          ...(box(selectedEl) ?? { top: 0, left: 0, w: 0, h: 0 }),
          pendingClass: selectedEl.classList.contains("poster--refill-pending"),
        }
      : null,
    picker: box(doc?.querySelector(".picker") ?? null),
    logs: logs.map((row) => `${new Date(row.t).toISOString().slice(11, 23)} ${row.msg}`),
  };
}

export function formatForYouDebugDump(dump: ForYouDebugDump): string {
  return JSON.stringify(dump, null, 2);
}
