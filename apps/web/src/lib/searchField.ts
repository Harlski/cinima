export type SearchFieldKind = "live" | "commit" | "idle";

export type SearchFieldAction = {
  kind: SearchFieldKind;
  query: string;
};

/**
 * Map a search-field DOM event plus the native input value to a search action.
 * iOS `type="search"` often skips `input` until commit and fires `search`
 * instead of form `submit`. Blur (`change`) still runs a live search so
 * results appear without a Recent searches tap.
 */
export function searchFieldAction(
  eventType: string,
  nativeValue: string
): SearchFieldAction {
  const query = nativeValue.trim() ? nativeValue : "";
  if (!nativeValue.trim()) {
    return { kind: "idle", query: "" };
  }
  if (eventType === "input" || eventType === "change") {
    return { kind: "live", query };
  }
  if (eventType === "search" || eventType === "submit") {
    return { kind: "commit", query };
  }
  return { kind: "idle", query };
}
