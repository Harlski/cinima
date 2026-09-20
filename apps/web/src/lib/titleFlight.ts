import { FOR_YOU_SLOT_ATTR } from "./forYouPass";
import {
  DIGEST_FLY_MS,
  DIGEST_ME_HINT_AT_MS,
  digestFaceFly,
  type DigestBox,
} from "./returnDigestFly";

export type TitleFlightKind = "watchlist" | "favorite" | "recommend";
export type TitleFlightTab = "watchlist" | "me";

export type TitleFlightBox = DigestBox;

export const TITLE_FLIGHT_MS = DIGEST_FLY_MS;
export const TITLE_FLIGHT_HINT_AT_MS = DIGEST_ME_HINT_AT_MS;
export const TITLE_FLIGHT_REACT_MS = 180;
export const TITLE_FLIGHT_HEX_AT_MS = 140;
export const TITLE_FLIGHT_HEX_IN_MS = 220;
export const TITLE_FLIGHT_GLOW_AT_MS = 300;
export const TITLE_FLIGHT_GLOW_IN_MS = 260;
export const TITLE_FLIGHT_RECOMMEND_STAGE_MS =
  TITLE_FLIGHT_GLOW_AT_MS + TITLE_FLIGHT_GLOW_IN_MS;

export const TITLE_FLIGHT_POSTER_ATTR = "data-flight-poster";
export const TITLE_FLIGHT_ORIGIN_ATTR = "data-flight-origin";
export const TITLE_FLIGHT_TARGET_ATTR = "data-flight-target";

export function shouldPlayTitleFlight(opts: {
  tourActive: boolean;
  onboarding: boolean;
  reduceMotion: boolean;
}): boolean {
  return !opts.tourActive && !opts.onboarding && !opts.reduceMotion;
}

export function titleFlightTab(kind: TitleFlightKind): TitleFlightTab {
  return kind === "watchlist" ? "watchlist" : "me";
}

export function titleFlightSettleMs(kind: TitleFlightKind): number {
  return stageMs(kind) + TITLE_FLIGHT_MS;
}

export function titleFlightHintAtMs(kind: TitleFlightKind): number {
  return stageMs(kind) + TITLE_FLIGHT_HINT_AT_MS;
}

export function recommendCueDelayMs(): number {
  return titleFlightSettleMs("recommend");
}

export function titleFlightFly(from: TitleFlightBox, to: TitleFlightBox) {
  return digestFaceFly(from, to);
}

function stageMs(kind: TitleFlightKind): number {
  return kind === "recommend" ? TITLE_FLIGHT_RECOMMEND_STAGE_MS : 0;
}

export type TitleFlightOriginNode = {
  closest(selector: string): TitleFlightOriginNode | null;
  querySelector(selector: string): TitleFlightOriginNode | null;
};

export function titleFlightPosterFrom(
  start: TitleFlightOriginNode | null
): TitleFlightOriginNode | null {
  if (!start) return null;
  const marked = start.closest(`[${TITLE_FLIGHT_POSTER_ATTR}]`);
  if (marked) return marked;
  return (
    start
      .closest(`[${TITLE_FLIGHT_ORIGIN_ATTR}]`)
      ?.querySelector(`[${TITLE_FLIGHT_POSTER_ATTR}]`) ?? null
  );
}

export type TitleFlightQueryRoot = {
  querySelector(selector: string): TitleFlightOriginNode | null;
};

/** For You Title flight leaves from the selected strip card, not the large poster. */
export function titleFlightOriginFromForYouSet(
  slotIndex: number,
  root: TitleFlightQueryRoot
): TitleFlightOriginNode | null {
  const slot = root.querySelector(`[${FOR_YOU_SLOT_ATTR}="${slotIndex}"]`);
  if (!slot) return null;
  return slot.querySelector(`[${TITLE_FLIGHT_POSTER_ATTR}]`);
}

export function titleFlightBoxFromElement(el: {
  getBoundingClientRect(): {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}): TitleFlightBox {
  const rect = el.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function titleFlightOriginElement(
  origin: Event | Element | null | undefined
): TitleFlightOriginNode | null {
  if (!origin) return null;
  if (typeof Element !== "undefined" && origin instanceof Element) return origin;
  const target = "target" in origin ? origin.target : null;
  if (typeof Element !== "undefined" && target instanceof Element) return target;
  return null;
}
