/** True when Vue Router / the browser has an in-app previous entry. */
export function hasInAppHistoryBack(
  state?: { back?: unknown } | null
): boolean {
  const historyState =
    state !== undefined
      ? state
      : typeof window !== "undefined"
        ? window.history.state
        : null;
  return historyState?.back != null && historyState.back !== "";
}
