/**
 * Username onboarding is required — no skip / dismiss.
 * Returning users without a handle are prompted again on next Discover visit.
 */

export function shouldOfferHandleOnboarding(opts: {
  walletAddress: string | null | undefined;
  handle: string | null | undefined;
  /** Dev / demo: show handle step even if handle already set */
  forceOffer?: boolean;
}): boolean {
  if (!opts.walletAddress) return false;
  if (opts.handle && !opts.forceOffer) return false;
  return true;
}

/** Client-side format checks (server also enforces + profanity). */
export function handleValidationError(raw: string): string | null {
  const cleaned = raw.replace(/^@/, "").trim().toLowerCase();
  if (cleaned.length < 3) return "Use at least 3 characters.";
  if (cleaned.length > 24) return "Use at most 24 characters.";
  if (!/^[a-z0-9_]+$/.test(cleaned)) {
    return "Use lowercase letters, numbers, or underscores only.";
  }
  return null;
}

export function mapHandleSaveError(message: string): string {
  switch (message) {
    case "handle_taken":
      return "That username is already taken.";
    case "invalid_handle":
      return "Use 3-24 lowercase letters, numbers, or underscores.";
    case "handle_profane":
      return "That username isn't allowed. Please choose another.";
    default:
      return message || "Could not save username.";
  }
}
