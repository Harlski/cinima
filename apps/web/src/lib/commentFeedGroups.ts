import type { CommentFeedItem, TitleSummary } from "@cinima/shared";

export type CommentFeedGroup = {
  title: TitleSummary;
  comments: CommentFeedItem[];
};

/** Group newest-first comments by title, keeping most recently active title first. */
export function groupCommentFeed(items: CommentFeedItem[]): CommentFeedGroup[] {
  const map = new Map<string, CommentFeedGroup>();
  for (const item of items) {
    const existing = map.get(item.title.id);
    if (existing) existing.comments.push(item);
    else map.set(item.title.id, { title: item.title, comments: [item] });
  }
  return [...map.values()];
}
