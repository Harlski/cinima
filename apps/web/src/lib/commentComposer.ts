import { normalizeCommentInput } from "@cinima/shared";

export function canPostComment(body: string, posting: boolean): boolean {
  return !posting && normalizeCommentInput(body).length > 0;
}

export function canDismissCommentSheet(posting: boolean): boolean {
  return !posting;
}

export function shouldCloseCommentSheet(opts: {
  wasPosting: boolean;
  posting: boolean;
  body: string;
}): boolean {
  return (
    opts.wasPosting &&
    !opts.posting &&
    normalizeCommentInput(opts.body).length === 0
  );
}
