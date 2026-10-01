const STORAGE_KEY = "cinima.brandHeaderShift";
const PENDING_KEY = "cinima.brandHeaderMovePending";

type ShiftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function clampBrandHeaderShift(shift: number, maxShift: number): number {
  if (!Number.isFinite(shift)) return 0;
  const value = Math.max(0, Math.round(shift));
  if (!Number.isFinite(maxShift)) return value;
  return Math.min(value, Math.max(0, Math.round(maxShift)));
}

/** A released drag earns Cameras watching when the wordmark rests somewhere new. */
export function brandHeaderMoveCommitted(startShift: number, endShift: number): boolean {
  const cap = Number.POSITIVE_INFINITY;
  return clampBrandHeaderShift(startShift, cap) !== clampBrandHeaderShift(endShift, cap);
}

export function brandHeaderShiftAfterDrag(
  startShift: number,
  deltaX: number,
  maxShift: number
): number {
  const delta = Number.isFinite(deltaX) ? deltaX : 0;
  return clampBrandHeaderShift(startShift + delta, maxShift);
}

function browserStorage(): ShiftStorage | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

export function loadBrandHeaderShift(storage: ShiftStorage | null = browserStorage()): number {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return clampBrandHeaderShift(Number(raw), Number.POSITIVE_INFINITY);
  } catch {
    return 0;
  }
}

/** A committed drag that has not yet been told to the API. */
export function noteBrandHeaderMove(storage: ShiftStorage | null = browserStorage()): void {
  try {
    storage?.setItem(PENDING_KEY, "1");
  } catch {
    /* private mode / missing storage */
  }
}

export function brandHeaderMovePending(storage: ShiftStorage | null = browserStorage()): boolean {
  try {
    return storage?.getItem(PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearBrandHeaderMovePending(storage: ShiftStorage | null = browserStorage()): void {
  try {
    storage?.removeItem(PENDING_KEY);
  } catch {
    /* private mode / missing storage */
  }
}

export function saveBrandHeaderShift(
  shift: number,
  storage: ShiftStorage | null = browserStorage()
): void {
  try {
    storage?.setItem(STORAGE_KEY, String(clampBrandHeaderShift(shift, Number.POSITIVE_INFINITY)));
  } catch {
    /* private mode / missing storage */
  }
}
