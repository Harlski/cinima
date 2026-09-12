import { describe, expect, it } from "vitest";
import { NimiqRpcError, unwrapNimiqRpcBody } from "../src/lib/nimiqRpc.js";

describe("Nimiq JSON-RPC unwrap", () => {
  it("reads a scalar from NimiqWatch { data, metadata }", () => {
    expect(
      unwrapNimiqRpcBody({
        jsonrpc: "2.0",
        result: { data: 61366412, metadata: null },
        id: 1,
      })
    ).toBe(61366412);
  });

  it("reads an account from NimiqWatch { data, metadata }", () => {
    expect(
      unwrapNimiqRpcBody({
        jsonrpc: "2.0",
        result: {
          data: {
            address: "NQ05 PEJ4 4J0G HAV3 SQSF XKJ6 Q4EV KGC8 98TG",
            balance: 0,
            type: "basic",
          },
          metadata: { blockNumber: 61366414 },
        },
        id: 1,
      })
    ).toEqual({
      address: "NQ05 PEJ4 4J0G HAV3 SQSF XKJ6 Q4EV KGC8 98TG",
      balance: 0,
      type: "basic",
    });
  });

  it("reads a bare JSON-RPC result", () => {
    expect(unwrapNimiqRpcBody({ jsonrpc: "2.0", result: true, id: 1 })).toBe(true);
  });

  it("surfaces the RPC error data string", () => {
    expect(() =>
      unwrapNimiqRpcBody({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal error",
          data: "Serialization error: Hit the end of buffer, expected more data",
        },
        id: 1,
      })
    ).toThrowError(new NimiqRpcError("Serialization error: Hit the end of buffer, expected more data"));
  });
});
