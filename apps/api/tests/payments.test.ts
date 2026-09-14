import { afterEach, describe, expect, it, vi } from "vitest";
import { USER_SEND_LUNA, normalizeWallet } from "@cinima/shared";
import { verifyUserSend } from "../src/services/payments.js";

const PAYER = "NQ16 2SSN 82TL SMQS KXT3 Q01V CMAL NU6F 1LJG";
const THANKEE = "NQ15 2JJ0 9C7J RGMP 14G4 D3J9 E63L N2A7 F93N";
const TX_HASH = "2cdb91140166c30326b0749627784f9f23334e5f37490b3a142883462eed9b59";
const MEMO = "Loved this take";
const MEMO_HEX = Buffer.from(MEMO, "utf8").toString("hex");

function nimiqWatchTxEnvelope(overrides?: Record<string, unknown>) {
  return {
    jsonrpc: "2.0",
    result: {
      data: {
        hash: TX_HASH,
        from: PAYER,
        fromType: 0,
        to: THANKEE,
        toType: 0,
        value: USER_SEND_LUNA,
        fee: 0,
        senderData: "",
        recipientData: MEMO_HEX,
        flags: 0,
        networkId: 24,
        ...overrides,
      },
      metadata: null,
    },
    id: 1,
  };
}

describe("User Send chain verify", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("rejects a NimiqWatch tx that did not pay the thankee", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (!init || String(init.method || "GET").toUpperCase() !== "POST") {
          return new Response(null, { status: 404 });
        }
        return Response.json(
          nimiqWatchTxEnvelope({ to: "NQ07 0000 0000 0000 0000 0000 0000 0000 0000" })
        );
      })
    );

    await expect(
      verifyUserSend({
        txHash: TX_HASH,
        payerWallet: normalizeWallet(PAYER),
        toWallet: normalizeWallet(THANKEE),
        minLuna: USER_SEND_LUNA,
      })
    ).rejects.toThrow("wrong_send_recipient");
  });

  it("accepts 1 NIM to the thankee from a NimiqWatch { data, metadata } tx", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (!init || String(init.method || "GET").toUpperCase() !== "POST") {
          return new Response(null, { status: 404 });
        }
        return Response.json(nimiqWatchTxEnvelope());
      })
    );

    await expect(
      verifyUserSend({
        txHash: TX_HASH,
        payerWallet: normalizeWallet(PAYER),
        toWallet: normalizeWallet(THANKEE),
        minLuna: USER_SEND_LUNA,
      })
    ).resolves.toMatchObject({
      hash: TX_HASH,
      from: normalizeWallet(PAYER),
      to: normalizeWallet(THANKEE),
      valueLuna: USER_SEND_LUNA,
      memo: MEMO,
    });
  });
});
