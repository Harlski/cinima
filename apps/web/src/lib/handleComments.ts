import { PROFILE_COMMENTS_PAGE_SIZE } from "@cinima/shared";

export function handleCommentsPath(wallet: string, offset = 0): string {
  const params = new URLSearchParams({
    limit: String(PROFILE_COMMENTS_PAGE_SIZE),
    offset: String(offset),
  });
  return `/users/${encodeURIComponent(wallet)}/comments?${params}`;
}
