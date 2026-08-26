import { describe, expect, it } from "vitest";
import {
  handleValidationError,
  mapHandleSaveError,
  shouldOfferHandleOnboarding,
} from "../src/lib/handleOnboarding";

const WALLET = "NQ05DEMOCINIMACYCLETWOWALLET0000001";

describe("handle onboarding", () => {
  it("offers handle step when user has no handle", () => {
    expect(
      shouldOfferHandleOnboarding({
        walletAddress: WALLET,
        handle: null,
      })
    ).toBe(true);
  });

  it("still offers handle when previously skipped localStorage would have dismissed", () => {
    // Username is required — dismiss is no longer honored.
    expect(
      shouldOfferHandleOnboarding({
        walletAddress: WALLET,
        handle: null,
      })
    ).toBe(true);
  });

  it("does not offer handle step when handle is already set", () => {
    expect(
      shouldOfferHandleOnboarding({
        walletAddress: WALLET,
        handle: "ada",
      })
    ).toBe(false);
  });

  it("dev force offer bypasses existing handle", () => {
    expect(
      shouldOfferHandleOnboarding({
        walletAddress: WALLET,
        handle: "ada",
        forceOffer: true,
      })
    ).toBe(true);
  });

  it("validates handle input", () => {
    expect(handleValidationError("ab")).toMatch(/3 characters/i);
    expect(handleValidationError("valid_handle")).toBeNull();
    expect(handleValidationError("@Valid123")).toBeNull();
    expect(handleValidationError("bad-handle")).toMatch(/underscores/i);
  });

  it("maps API save errors", () => {
    expect(mapHandleSaveError("handle_taken")).toMatch(/already taken/i);
    expect(mapHandleSaveError("invalid_handle")).toMatch(/3-24/i);
    expect(mapHandleSaveError("handle_profane")).toMatch(/isn't allowed/i);
  });
});
