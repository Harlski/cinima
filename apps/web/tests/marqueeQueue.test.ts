import { describe, expect, it } from "vitest";
import {
  currentMarquee,
  dismissMarquee,
  enqueueMarquee,
  emptyMarqueeQueue,
} from "../src/lib/marqueeQueue";

describe("Marquee queue", () => {
  it("shows one Achievement at a time in the order earned", () => {
    let q = emptyMarqueeQueue();
    expect(currentMarquee(q)).toBeNull();
    q = enqueueMarquee(q, { kind: "opening-night" });
    q = enqueueMarquee(q, { kind: "bravo" });
    expect(currentMarquee(q)?.kind).toBe("opening-night");
    q = dismissMarquee(q);
    expect(currentMarquee(q)?.kind).toBe("bravo");
    q = dismissMarquee(q);
    expect(currentMarquee(q)).toBeNull();
  });

  it("does not enqueue a duplicate kind already waiting", () => {
    let q = emptyMarqueeQueue();
    q = enqueueMarquee(q, { kind: "opening-night" });
    q = enqueueMarquee(q, { kind: "opening-night" });
    q = dismissMarquee(q);
    expect(currentMarquee(q)).toBeNull();
  });
});
