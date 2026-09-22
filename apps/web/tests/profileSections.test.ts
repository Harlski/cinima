import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PROFILE_SECTIONS } from "../src/lib/profileSections";

describe("profile section slider", () => {
  it("offers Likes, Posts, and Thanks in that order", () => {
    expect(PROFILE_SECTIONS.map((section) => section.label)).toEqual([
      "Likes",
      "Posts",
      "Thanks",
    ]);
  });

  it("puts Me and other Handles behind the same slider", () => {
    const me = readFileSync(new URL("../src/views/Me.vue", import.meta.url), "utf8");
    const user = readFileSync(new URL("../src/views/User.vue", import.meta.url), "utf8");
    for (const source of [me, user]) {
      expect(source).toContain("<ProfileSectionTabs>");
      expect(source).toContain('template #likes');
      expect(source).toContain('template #posts');
      expect(source).toContain('template #thanks');
    }
  });
});
