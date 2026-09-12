import { describe, expect, it } from "vitest";
import {
  acceptedWaitLabel,
  acceptedWaitUsesSpinner,
} from "../src/lib/acceptedWait";

describe("accepted wait labels", () => {
  it("keeps the idle label until the tap has landed", () => {
    expect(acceptedWaitLabel("Continue", false)).toBe("Continue");
    expect(acceptedWaitLabel("Skip", false)).toBe("Skip");
    expect(acceptedWaitLabel("Enter", false)).toBe("Enter");
    expect(acceptedWaitLabel("Save", false)).toBe("Save");
    expect(acceptedWaitLabel("Post", false)).toBe("Post");
    expect(acceptedWaitLabel("Thank all", false)).toBe("Thank all");
    expect(acceptedWaitLabel("Remove", false)).toBe("Remove");
    expect(acceptedWaitLabel("Send", false)).toBe("Send");
    expect(acceptedWaitLabel("Everyone", false)).toBe("Everyone");
    expect(acceptedWaitLabel("Ping me", false)).toBe("Ping me");
    expect(acceptedWaitLabel("Follow", false)).toBe("Follow");
  });

  it("names the wait on primary commits that stay on the same screen", () => {
    expect(acceptedWaitLabel("Continue", true)).toBe("Continuing…");
    expect(acceptedWaitLabel("Skip", true)).toBe("Skipping…");
    expect(acceptedWaitLabel("Enter", true)).toBe("Entering…");
    expect(acceptedWaitLabel("Save", true)).toBe("Saving…");
    expect(acceptedWaitLabel("Post", true)).toBe("Posting…");
    expect(acceptedWaitLabel("Thank all", true)).toBe("Thanking…");
    expect(acceptedWaitLabel("Remove", true)).toBe("Removing…");
    expect(acceptedWaitLabel("Send", true)).toBe("Sending…");
    expect(acceptedWaitLabel("Everyone", true)).toBe("Sending…");
    expect(acceptedWaitLabel("Ping me", true)).toBe("Pinging…");
  });

  it("keeps Follow while busy because Following already means the person is followed", () => {
    expect(acceptedWaitLabel("Follow", true)).toBe("Follow");
    expect(acceptedWaitLabel("Following", true)).toBe("Following");
    expect(acceptedWaitUsesSpinner("Follow")).toBe(true);
    expect(acceptedWaitUsesSpinner("Following")).toBe(true);
    expect(acceptedWaitUsesSpinner("Continue")).toBe(false);
  });
});
