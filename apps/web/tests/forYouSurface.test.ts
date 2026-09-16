import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { createPinia, setActivePinia } from "pinia";
import type { OverlapSuggestion, TitleSummary } from "@cinima/shared";
import ForYouPicker from "../src/components/ForYouPicker.vue";
import { syncDeckItems } from "../src/lib/deckSelection";

const pickerSrc = readFileSync(
  path.resolve(__dirname, "../src/components/TitleDeckPicker.vue"),
  "utf8"
);
const forYouPickerSrc = readFileSync(
  path.resolve(__dirname, "../src/components/ForYouPicker.vue"),
  "utf8"
);
const discoverSrc = readFileSync(
  path.resolve(__dirname, "../src/views/Discover.vue"),
  "utf8"
);

function cssBlock(src: string, selector: string): string {
  const match = src.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{[^}]*\\}`));
  if (!match) throw new Error(`missing CSS block ${selector}`);
  return match[0];
}

function title(id: string, name: string, poster = true): TitleSummary {
  return {
    id,
    mediaType: "movie",
    tmdbId: Number(id.replace(/\D/g, "") || 1),
    title: name,
    year: 2024,
    posterUrl: poster ? `https://img.test/${id}.jpg` : null,
    overview: `${name} overview`,
    rating: 8,
    popularity: 1,
    imdbId: null,
  };
}

function suggestion(id: string, name: string): OverlapSuggestion {
  return {
    title: title(id, name),
    sharedCount: 0,
    sampleWallets: [],
    recommendCount: 0,
    favoriteCount: 0,
  };
}

const FOR_YOU_SET: OverlapSuggestion[] = [
  suggestion("movie:1", "Alpha"),
  suggestion("movie:2", "Bravo"),
  suggestion("movie:3", "Centerpiece"),
  suggestion("movie:4", "Delta"),
  suggestion("movie:5", "Echo"),
];

function stubLocalStorage() {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
}

async function renderForYou(suggestions: OverlapSuggestion[]) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const app = createSSRApp(ForYouPicker, {
    suggestions,
    isFavorite: () => false,
    isOnWatchlist: () => false,
  });
  app.use(pinia);
  return renderToString(app);
}

describe("For You selected title surface", () => {
  beforeEach(() => {
    stubLocalStorage();
  });

  it("shows the center title and Watchlist/Favorites actions when the set has titles", async () => {
    const html = await renderForYou(FOR_YOU_SET);

    expect(html).toContain("Centerpiece");
    expect(html).toContain("Add to Watchlist");
    expect(html).toContain("Add to Favorites");
  });

  it("omits a Title with no poster", async () => {
    const html = await renderForYou([
      {
        ...suggestion("movie:blank", "BlankLetter"),
        title: title("movie:blank", "BlankLetter", false),
      },
      ...FOR_YOU_SET,
    ]);

    expect(html).not.toContain("BlankLetter");
    expect(html).toContain("Centerpiece");
  });

  it("keeps a selected title for every non-empty For You set size", () => {
    for (let n = 1; n <= 5; n++) {
      const items = FOR_YOU_SET.slice(0, n).map((row) => ({ title: row.title }));
      const synced = syncDeckItems(items, null);
      expect(synced.items[synced.selectedIndex]?.title.title).toBeTruthy();
    }
  });

  it("does not re-center For You after a Pass", () => {
    expect(pickerSrc).toContain("selectedIndexAfterDeckChange");
    expect(forYouPickerSrc).not.toMatch(
      /watch\(\s*\(\) => deckItems\.value\.map/
    );
  });
});

describe("For You narrow Android column", () => {
  it("lets the title and Watchlist/Favorites column shrink beside the poster", () => {
    expect(cssBlock(pickerSrc, ".poster-section")).toMatch(/width:\s*100%/);
    expect(cssBlock(pickerSrc, ".poster-section")).toMatch(/min-width:\s*0/);
    expect(cssBlock(pickerSrc, ".meta")).toMatch(/min-width:\s*0/);
  });

  it("bounds the line-clamped title so -webkit-box cannot blow out the actions", () => {
    const h2 = cssBlock(pickerSrc, ".meta h2");
    expect(h2).toMatch(/min-width:\s*0/);
    expect(h2).toMatch(/max-width:\s*100%/);
    expect(h2).toMatch(/width:\s*100%/);
  });

  it("does not clip Watchlist/Favorites inside the title column", () => {
    expect(cssBlock(pickerSrc, ".meta")).not.toMatch(/overflow:\s*hidden/);
  });

  it("lets the For You section shrink inside the Discover column", () => {
    expect(discoverSrc).toMatch(/\n\.discover-body \{[\s\S]*?min-width:\s*0/);
    expect(discoverSrc).toMatch(/\n\.suggestions-section \{[\s\S]*?min-width:\s*0/);
  });
});

describe("For You refill flash", () => {
  it("hides the next set before those cards can paint at rest", () => {
    const onPass = discoverSrc.slice(
      discoverSrc.indexOf("const onPass"),
      discoverSrc.indexOf("async function dropFromLocalSet")
    );
    const hideAt = onPass.indexOf("beginRefill");
    const assignAt = onPass.indexOf("suggestions.value = data.suggestions");
    expect(hideAt).toBeGreaterThanOrEqual(0);
    expect(assignAt).toBeGreaterThan(hideAt);
  });
});
