import { describe, expect, it } from "vitest";
import {
  PAY_CANCELLED_MESSAGE,
  PAY_FAILED_MESSAGE,
  PAY_SPENDABLE_BALANCE_HINT,
  PAY_UNKNOWN_FAILURE_HINT,
  WRONG_SEND_PAYER_MESSAGE,
  PayCancelledError,
  isPayCancelled,
  payErrorDetail,
  payUserMessage,
  userSendFailure,
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
    expect(payUserMessage(new Error("wrong_send_payer"))).toBe(WRONG_SEND_PAYER_MESSAGE);
  });

  it("shows one line for a User Send failure and keeps the host text for the notice", () => {
    expect(userSendFailure(new Error("User cancelled"))).toEqual({
      copy: PAY_CANCELLED_MESSAGE,
      detail: null,
      hint: null,
    });
    expect(userSendFailure(undefined)).toEqual({
      copy: PAY_CANCELLED_MESSAGE,
      detail: null,
      hint: null,
    });

    expect(userSendFailure(new Error("Insufficient funds"))).toEqual({
      copy: PAY_FAILED_MESSAGE,
      detail: "Insufficient funds",
      hint: PAY_UNKNOWN_FAILURE_HINT,
    });
    expect(
      userSendFailure(
        new Error("Failed to send payment transaction: Transaction value exceeds balance")
      )
    ).toEqual({
      copy: PAY_FAILED_MESSAGE,
      detail: "Failed to send payment transaction: Transaction value exceeds balance",
      hint: PAY_SPENDABLE_BALANCE_HINT,
    });
    expect(
      userSendFailure(new Error('[birpc] timeout on calling "handleRequest"'))
    ).toEqual({
      copy: PAY_FAILED_MESSAGE,
      detail: '[birpc] timeout on calling "handleRequest"',
      hint: PAY_UNKNOWN_FAILURE_HINT,
    });
    expect(userSendFailure({ error: { type: "NETWORK_ERROR", message: "rpc down" } })).toEqual({
      copy: PAY_FAILED_MESSAGE,
      detail: "NETWORK_ERROR: rpc down",
      hint: PAY_UNKNOWN_FAILURE_HINT,
    });
    expect(userSendFailure(new Error("tx_not_found"))).toEqual({
      copy: PAY_FAILED_MESSAGE,
      detail: "tx_not_found",
      hint: PAY_UNKNOWN_FAILURE_HINT,
    });
    expect(payErrorDetail({ foo: 1 })).toBe("unknown");
    expect(userSendFailure({ foo: 1 }).copy).toBe(PAY_FAILED_MESSAGE);
  });
});
