import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const src = readFileSync(
  path.resolve(__dirname, "../src/components/TitleDeckPicker.vue"),
  "utf8"
);

describe("title selector dock", () => {
  it("lets the page hex show through behind the poster strip", () => {
    expect(src).not.toMatch(/\.dock::before\s*\{/);
    expect(src).toMatch(
      /\.dock \{[\s\S]*?background: linear-gradient\(\s*to bottom,[\s\S]*?transparent 42%/
    );
    expect(src).not.toMatch(
      /\.dock \{[\s\S]*?var\(--bg-primary\) 48%/
    );
  });
});
