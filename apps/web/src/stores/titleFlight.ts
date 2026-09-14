import { defineStore } from "pinia";
import { ref } from "vue";
import type { TitleSummary } from "@cinima/shared";
import {
  shouldPlayTitleFlight,
  titleFlightBoxFromElement,
  titleFlightOriginElement,
  titleFlightPosterFrom,
  titleFlightTab,
  type TitleFlightBox,
  type TitleFlightKind,
} from "@/lib/titleFlight";
import { useGuidedTourStore } from "@/stores/guidedTour";

export type TitleFlight = {
  id: number;
  kind: TitleFlightKind;
  from: TitleFlightBox;
  posterUrl: string | null;
  titleName: string;
};

type TitleFlightTitle = Pick<TitleSummary, "title"> & {
  posterUrl?: string | null;
};

let nextId = 1;

export const useTitleFlightStore = defineStore("titleFlight", () => {
  const flights = ref<TitleFlight[]>([]);
  const watchlistTabHint = ref(false);
  const meTabHint = ref(false);
  let watchlistHintTimer: ReturnType<typeof setTimeout> | null = null;
  let meHintTimer: ReturnType<typeof setTimeout> | null = null;

  function play(input: {
    kind: TitleFlightKind;
    title: TitleFlightTitle;
    origin?: Event | Element | null;
    from?: TitleFlightBox | null;
    force?: boolean;
  }): boolean {
    if (!input.force && !shouldPlayTitleFlight(currentGates())) return false;
    const from = input.from ?? boxFromOrigin(input.origin);
    if (!from) return false;
    flights.value = [
      ...flights.value,
      {
        id: nextId++,
        kind: input.kind,
        from,
        posterUrl: input.title.posterUrl ?? null,
        titleName: input.title.title,
      },
    ];
    return true;
  }

  function dismiss(id: number) {
    flights.value = flights.value.filter((flight) => flight.id !== id);
  }

  function clear() {
    flights.value = [];
  }

  function flashTab(kind: TitleFlightKind) {
    const tab = titleFlightTab(kind);
    if (tab === "watchlist") {
      watchlistTabHint.value = true;
      if (watchlistHintTimer != null) window.clearTimeout(watchlistHintTimer);
      watchlistHintTimer = window.setTimeout(() => {
        watchlistTabHint.value = false;
        watchlistHintTimer = null;
      }, 700);
      return;
    }
    meTabHint.value = true;
    if (meHintTimer != null) window.clearTimeout(meHintTimer);
    meHintTimer = window.setTimeout(() => {
      meTabHint.value = false;
      meHintTimer = null;
    }, 700);
  }

  return {
    flights,
    watchlistTabHint,
    meTabHint,
    play,
    dismiss,
    clear,
    flashTab,
  };
});

function currentGates(): {
  tourActive: boolean;
  onboarding: boolean;
  reduceMotion: boolean;
} {
  const tour = useGuidedTourStore();
  return {
    tourActive: tour.active || tour.offering,
    onboarding:
      typeof document !== "undefined" &&
      !!document.querySelector(".discover--onboarding, .discover--handle"),
    reduceMotion:
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

function boxFromOrigin(origin?: Event | Element | null): TitleFlightBox | null {
  const start = titleFlightOriginElement(origin);
  const poster = titleFlightPosterFrom(start);
  if (!poster || !("getBoundingClientRect" in poster)) return null;
  return titleFlightBoxFromElement(
    poster as { getBoundingClientRect(): DOMRect }
  );
}
