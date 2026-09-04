import { describe, expect, it } from "vitest";
import { profileShareSheetPreview } from "../src/lib/profileShare";

describe("profile share sheet", () => {
  it("uses the profile Share preview PNG URL, not a TMDB poster", () => {
    const preview = profileShareSheetPreview({
      origin: "https://cinima.app",
      handle: "alice",
      shareUrl: "https://cinima.app/s/abc123xy",
    });
    expect(preview.imageUrl).toBe("https://cinima.app/api/og/profile/alice.png");
    expect(preview.headline).toBe("alice on Cinima");
    expect(preview.description).toBe(
      "Check out alice's favorite movies & tv shows on Cinima.app"
    );
    expect(preview.url).toBe("https://cinima.app/s/abc123xy");
  });
});
