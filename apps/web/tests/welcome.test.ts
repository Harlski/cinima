import { describe, expect, it } from "vitest";
import {
  isReturningUser,
  welcomeMessage,
} from "../src/lib/welcome";

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
      })
    ).toBe("Welcome Back!");
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
