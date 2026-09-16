/** Idle CTA copy → progressive form while the API has not returned. */
const ACCEPTED_WAIT_LABELS: Record<string, string> = {
  Continue: "Continuing…",
  Skip: "Skipping…",
  Enter: "Entering…",
  Save: "Saving…",
  Post: "Posting…",
  "Thank all": "Thanking…",
  Remove: "Removing…",
  Send: "Sending…",
  "Load more": "Loading…",
  "Send Custom Message": "Sending…",
  Everyone: "Sending…",
  "Ping me": "Pinging…",
};

/** Follow/Following keep their idle label: Following already means the person is followed. */
export function acceptedWaitUsesSpinner(idle: string): boolean {
  return idle === "Follow" || idle === "Following";
}

/** Label shown on a committed control while Cinima is still talking to the API. */
export function acceptedWaitLabel(idle: string, busy: boolean): string {
  if (!busy) return idle;
  if (acceptedWaitUsesSpinner(idle)) return idle;
  return ACCEPTED_WAIT_LABELS[idle] ?? `${idle}…`;
}
