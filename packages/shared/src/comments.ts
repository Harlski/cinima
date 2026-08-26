export const DELETED_COMMENT_LABEL = "Deleted by user";

export const COMMENT_MAX_LENGTH = 500;

export function normalizeCommentInput(body: string): string {
  return body.trim().slice(0, COMMENT_MAX_LENGTH);
}
