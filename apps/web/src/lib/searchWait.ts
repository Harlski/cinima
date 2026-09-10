export const SEARCH_WAIT_DEADLINE_MS = 8_000;

export type SearchWait =
  | "history"
  | "searching"
  | "retry"
  | "empty"
  | "results";

export function searchWait(input: {
  query: string;
  loading: boolean;
  failed: boolean;
  resultCount: number;
}): SearchWait {
  if (!input.query.trim()) return "history";
  if (input.resultCount > 0) return "results";
  if (input.loading) return "searching";
  if (input.failed) return "retry";
  return "empty";
}
