import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const webRoot = path.resolve(__dirname, "..");

describe("Muli / Mulish app text", () => {
  it("vendors variable Mulish files for Muli and Mulish faces", () => {
    const latin = path.join(webRoot, "public/fonts/mulish-latin-wght-normal.woff2");
    const latinExt = path.join(
      webRoot,
      "public/fonts/mulish-latin-ext-wght-normal.woff2"
    );
    expect(existsSync(latin)).toBe(true);
    expect(existsSync(latinExt)).toBe(true);
    expect(statSync(latin).size).toBeGreaterThan(10_000);
    expect(statSync(latinExt).size).toBeGreaterThan(10_000);

    const faces = readFileSync(path.join(webRoot, "src/assets/fonts.css"), "utf8");
    expect(faces).toContain('font-family: "Muli"');
    expect(faces).toContain('font-family: "Mulish"');
    expect(faces).toContain("/fonts/mulish-latin-wght-normal.woff2");
  });

  it("puts Muli first on all app text, including form controls", () => {
    const css = readFileSync(path.join(webRoot, "src/assets/style.css"), "utf8");
    expect(css).toContain('--nq-font-sans: "Muli", "Mulish"');
    expect(css).toMatch(/\*\s*\{[^}]*font-family:\s*inherit/s);
    expect(css).toContain('html {\n  color-scheme: dark;\n  font-family: var(--font);');
  });

  it("does not import fonts.css into style.css (that drops Nimiq colors)", () => {
    const css = readFileSync(path.join(webRoot, "src/assets/style.css"), "utf8");
    const boot = readFileSync(path.join(webRoot, "src/main.ts"), "utf8");
    expect(css).not.toContain('import "./fonts.css"');
    expect(css.trimStart().startsWith("@layer reset, nq-colors, nq-utilities;")).toBe(
      true
    );
    expect(css).toContain('@import "nimiq-css/css/colors.css" layer(nq-colors);');
    expect(boot).toContain('import "./assets/fonts.css"');
  });
});
