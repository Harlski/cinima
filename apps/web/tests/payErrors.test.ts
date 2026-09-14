import { describe, expect, it } from "vitest";
import {
  PAY_CANCELLED_MESSAGE,
  PayCancelledError,
  isPayCancelled,
  payUserMessage,
} from "../src/lib/nimiqPay";

describe("Pay cancel vs failure", () => {
  it("treats reject and dismiss as Cancelled, not a failure", () => {
    expect(isPayCancelled({ error: { type: "PermissionDeniedError" } })).toBe(true);
    expect(isPayCancelled({ error: { type: "PERMISSION_DENIED" } })).toBe(true);
    expect(isPayCancelled(new Error("User rejected the confirmation dialog"))).toBe(true);
    expect(isPayCancelled(new Error("User cancelled"))).toBe(true);
    expect(isPayCancelled({ message: "canceled" })).toBe(true);
    expect(isPayCancelled({ message: "dismissed" })).toBe(true);
    expect(isPayCancelled({ message: "Rejected" })).toBe(true);
    expect(isPayCancelled({ code: 4001, message: "User rejected the request" })).toBe(true);
    expect(isPayCancelled(new PayCancelledError())).toBe(true);
    expect(isPayCancelled({ error: {} })).toBe(true);
    expect(isPayCancelled(undefined)).toBe(true);
    expect(isPayCancelled(null)).toBe(true);

    expect(payUserMessage({ error: { type: "PermissionDeniedError" } })).toBe(
      PAY_CANCELLED_MESSAGE
    );
    expect(payUserMessage(undefined)).toBe(PAY_CANCELLED_MESSAGE);
  });

  it("keeps real Pay and attach failures as failures", () => {
    expect(isPayCancelled({ error: { type: "InvalidTransactionError", message: "bad data" } })).toBe(
      false
    );
    expect(isPayCancelled(new Error("Insufficient funds"))).toBe(false);
    expect(isPayCancelled({ error: { type: "NETWORK_ERROR", message: "rpc down" } })).toBe(false);
    expect(isPayCancelled(new Error("pay_failed"))).toBe(false);
    expect(isPayCancelled(new Error("Already sent"))).toBe(false);

    expect(payUserMessage(new Error("Insufficient funds"))).toBe("Insufficient funds");
    expect(payUserMessage({ error: { type: "NETWORK_ERROR", message: "rpc down" } })).toBe(
      "rpc down"
    );
    expect(payUserMessage(new Error("pay_failed"))).toBe("Send failed");
    expect(payUserMessage({ foo: 1 })).toBe("Send failed");
  });
});
