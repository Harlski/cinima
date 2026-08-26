import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  advanceForceOnboardingToFavorites,
  armForceOnboardingFlow,
  clearForceOnboardingFlow,
  isForceFavoritesArmed,
  isForceHandleArmed,
  isForceOnboardingArmed,
  isReturningUser,
  welcomeMessage,
} from "../src/lib/welcome";
import { isForceGuidedTourArmed } from "../src/lib/guidedTour";

describe("Welcome gate", () => {
  it("says Welcome Back for restored sessions or users with history", () => {
    expect(
      welcomeMessage({
        returning: isReturningUser({
          hadToken: true,
          handle: null,
          favoriteCount: 0,
        }),
      })
    ).toBe("Welcome Back!");
    expect(
      welcomeMessage({
        returning: isReturningUser({
          hadToken: false,
          handle: "ada",
          favoriteCount: 0,
        }),
        handle: "ada",
      })
    ).toBe("Welcome Back, ada!");
    expect(
      welcomeMessage({
        returning: isReturningUser({
          hadToken: false,
          handle: null,
          favoriteCount: 3,
        }),
      })
    ).toBe("Welcome Back!");
  });

  it("says Welcome for first-time wallets", () => {
    expect(
      welcomeMessage({
        returning: isReturningUser({
          hadToken: false,
          handle: null,
          favoriteCount: 0,
        }),
      })
    ).toBe("Welcome!");
  });
});

describe("Dev force onboarding session arm", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value);
        },
        removeItem: (key: string) => {
          memory.delete(key);
        },
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "sessionStorage");
  });

  it("arms handle first, then advances to favorites", () => {
    expect(isForceOnboardingArmed()).toBe(false);
    armForceOnboardingFlow();
    expect(isForceHandleArmed()).toBe(true);
    expect(isForceFavoritesArmed()).toBe(false);
    expect(isForceOnboardingArmed()).toBe(true);
    expect(isForceGuidedTourArmed()).toBe(true);

    // Simulates remount after ?pickFavorites=1 is stripped from the URL
    expect(isForceHandleArmed()).toBe(true);

    advanceForceOnboardingToFavorites();
    expect(isForceHandleArmed()).toBe(false);
    expect(isForceFavoritesArmed()).toBe(true);
    expect(isForceOnboardingArmed()).toBe(true);

    clearForceOnboardingFlow();
    expect(isForceHandleArmed()).toBe(false);
    expect(isForceFavoritesArmed()).toBe(false);
    expect(isForceOnboardingArmed()).toBe(false);
  });

  it("advance is a no-op when flow was never armed", () => {
    advanceForceOnboardingToFavorites();
    expect(isForceFavoritesArmed()).toBe(false);
  });
});
