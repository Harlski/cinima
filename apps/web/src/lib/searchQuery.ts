export function parseSearchQuery(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : "";
}

export function searchRouteQuery(query: string): { q?: string } {
  return query.trim() ? { q: query } : {};
}
