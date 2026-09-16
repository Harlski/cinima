import { defineStore } from "pinia";
import { ref } from "vue";
import type { TitleSummary } from "@cinima/shared";
import {
  FOR_YOU_ORIGIN_ATTR,
  FOR_YOU_SLOT_ATTR,
  forYouRefillDelay,
  shouldPlayForYouMotion,
  scheduleForYouRefillHandoff,
} from "@/lib/forYouPass";
import {
  titleFlightBoxFromElement,
  titleFlightOriginElement,
  titleFlightPosterFrom,
  type TitleFlightBox,
} from "@/lib/titleFlight";
import { deckCenterIndex, deckScrollLeftToCenter } from "@/lib/deckSelection";
import { useGuidedTourStore } from "@/stores/guidedTour";

export type PassFizzle = {
  id: number;
  from: TitleFlightBox;
  to: TitleFlightBox;
  posterUrl: string | null;
  titleName: string;
  progress: number;
  phase: "drag" | "commit";
};

export type ForYouRefill = {
  id: number;
  slot: number;
  from: TitleFlightBox;
  to: TitleFlightBox;
  posterUrl: string | null;
  titleName: string;
  delayMs: number;
  selected: boolean;
};

let nextId = 1;

export const useForYouMotionStore = defineStore("forYouMotion", () => {
  const fizzles = ref<PassFizzle[]>([]);
  const refills = ref<ForYouRefill[]>([]);
  const pendingRefillSlots = ref<number[]>([]);

  function cinimaOriginBox(): TitleFlightBox | null {
    if (typeof document === "undefined") return null;
    const originEl = document.querySelector(`[${FOR_YOU_ORIGIN_ATTR}]`);
    if (!originEl) return null;
    return titleFlightBoxFromElement(originEl);
  }

  function beginFizzle(input: {
    title: Pick<TitleSummary, "title"> & { posterUrl?: string | null };
    origin?: Event | Element | null;
    from?: TitleFlightBox | null;
    force?: boolean;
  }): number | null {
    if (!input.force && !shouldPlayForYouMotion(currentGates())) return null;
    const from = input.from ?? boxFromOrigin(input.origin);
    if (!from) return null;
    const to = cinimaOriginBox() ?? {
      left: from.left,
      top: Math.max(0, from.top - 240),
      width: from.width,
      height: Math.max(16, from.height * 0.2),
    };
    const id = nextId++;
    fizzles.value = [
      ...fizzles.value,
      {
        id,
        from,
        to,
        posterUrl: input.title.posterUrl ?? null,
        titleName: input.title.title,
        progress: 0,
        phase: "drag",
      },
    ];
    return id;
  }

  function setFizzleProgress(id: number, progress: number) {
    fizzles.value = fizzles.value.map((item) =>
      item.id === id && item.phase === "drag"
        ? { ...item, progress: Math.min(1, Math.max(0, progress)) }
        : item
    );
  }

  function commitFizzle(id: number) {
    fizzles.value = fizzles.value.map((item) =>
      item.id === id ? { ...item, phase: "commit" } : item
    );
  }

  function cancelFizzle(id: number) {
    fizzles.value = fizzles.value.filter((item) => item.id !== id);
  }

  function playFizzle(input: {
    title: Pick<TitleSummary, "title"> & { posterUrl?: string | null };
    origin?: Event | Element | null;
    from?: TitleFlightBox | null;
    force?: boolean;
  }): boolean {
    const id = beginFizzle(input);
    if (id == null) return false;
    commitFizzle(id);
    return true;
  }

  function beginRefill(count: number) {
    const n = Math.max(0, count);
    if (n === 0 || !shouldPlayForYouMotion(currentGates())) {
      pendingRefillSlots.value = [];
      return;
    }
    pendingRefillSlots.value = Array.from({ length: n }, (_, slot) => slot);
  }

  function playRefill(
    titles: Array<Pick<TitleSummary, "title"> & { posterUrl?: string | null }>,
    opts?: { force?: boolean }
  ): boolean {
    if (!opts?.force && !shouldPlayForYouMotion(currentGates())) {
      pendingRefillSlots.value = [];
      return false;
    }
    if (typeof document === "undefined") {
      pendingRefillSlots.value = [];
      return false;
    }
    const originEl = document.querySelector(`[${FOR_YOU_ORIGIN_ATTR}]`);
    if (!originEl) {
      pendingRefillSlots.value = [];
      return false;
    }
    snapForYouStripToCenter(titles.length);
    const from = titleFlightBoxFromElement(originEl);
    const next: ForYouRefill[] = [];
    titles.forEach((title, index) => {
      const slot = document.querySelector(`[${FOR_YOU_SLOT_ATTR}="${index}"]`);
      if (!slot) return;
      next.push({
        id: nextId++,
        slot: index,
        from,
        to: titleFlightBoxFromElement(slot),
        posterUrl: title.posterUrl ?? null,
        titleName: title.title,
        delayMs: forYouRefillDelay(index, titles.length),
        selected: index === deckCenterIndex(titles.length),
      });
    });
    if (next.length !== titles.length) {
      pendingRefillSlots.value = [];
      return false;
    }
    pendingRefillSlots.value = next.map((item) => item.slot);
    refills.value = [...refills.value, ...next];
    return true;
  }

  function dismissFizzle(id: number) {
    fizzles.value = fizzles.value.filter((item) => item.id !== id);
  }

  function dismissRefill(id: number) {
    const finished = refills.value.find((item) => item.id === id);
    if (finished) {
      pendingRefillSlots.value = pendingRefillSlots.value.filter(
        (slot) => slot !== finished.slot
      );
    }
    scheduleForYouRefillHandoff(() => {
      refills.value = refills.value.filter((item) => item.id !== id);
    });
  }

  function reset() {
    fizzles.value = [];
    refills.value = [];
    pendingRefillSlots.value = [];
  }

  return {
    fizzles,
    refills,
    pendingRefillSlots,
    beginFizzle,
    setFizzleProgress,
    commitFizzle,
    cancelFizzle,
    playFizzle,
    beginRefill,
    playRefill,
    dismissFizzle,
    dismissRefill,
    reset,
  };
});

function currentGates(): {
  tourActive: boolean;
  tourForYouPass: boolean;
  onboarding: boolean;
  reduceMotion: boolean;
} {
  const tour = useGuidedTourStore();
  return {
    tourActive: tour.active || tour.offering,
    tourForYouPass: tour.active && tour.step?.id === "for-you",
    onboarding:
      typeof document !== "undefined" &&
      !!document.querySelector(".discover--onboarding, .discover--handle"),
    reduceMotion:
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

function snapForYouStripToCenter(count: number) {
  const center = deckCenterIndex(count);
  const centerEl = document.querySelector(`[${FOR_YOU_SLOT_ATTR}="${center}"]`);
  if (!(centerEl instanceof HTMLElement)) return;
  const strip = centerEl.parentElement;
  if (!strip) return;
  strip.scrollLeft = deckScrollLeftToCenter(strip, center);
}

function boxFromOrigin(origin?: Event | Element | null): TitleFlightBox | null {
  const start = titleFlightOriginElement(origin);
  const poster = titleFlightPosterFrom(start);
  if (!poster || !("getBoundingClientRect" in poster)) return null;
  return titleFlightBoxFromElement(
    poster as { getBoundingClientRect(): DOMRect }
  );
}
