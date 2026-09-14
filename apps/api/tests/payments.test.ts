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

function rpcError(data: string) {
  return {
    jsonrpc: "2.0",
    error: { code: -32603, message: "Internal error", data },
    id: 1,
  };
}

describe("User Send chain verify", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("finds a User Send after NimiqWatch first says Transaction not found", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("CINIMA_TX_LOOKUP_DELAY_MS", "0");
    let posts = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (!init || String(init.method || "GET").toUpperCase() !== "POST") {
          return new Response(null, { status: 404 });
        }
        posts += 1;
        if (posts < 3) {
          return Response.json(rpcError(`Transaction not found: ${TX_HASH}`));
        }
        return Response.json(nimiqWatchTxEnvelope());
      })
    );

    await expect(
      verifyUserSend({
        txHash: `0x${TX_HASH.toUpperCase()}`,
        payerWallet: normalizeWallet(PAYER),
        toWallet: normalizeWallet(THANKEE),
        minLuna: USER_SEND_LUNA,
      })
    ).resolves.toMatchObject({
      to: normalizeWallet(THANKEE),
      memo: MEMO,
      valueLuna: USER_SEND_LUNA,
    });
  });

  it("still errors when the tx never appears on NimiqWatch", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("CINIMA_TX_LOOKUP_DELAY_MS", "0");
    vi.stubEnv("CINIMA_TX_LOOKUP_ATTEMPTS", "2");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (!init || String(init.method || "GET").toUpperCase() !== "POST") {
          return new Response(null, { status: 404 });
        }
        return Response.json(rpcError(`Transaction not found: ${TX_HASH}`));
      })
    );

    await expect(
      verifyUserSend({
        txHash: TX_HASH,
        payerWallet: normalizeWallet(PAYER),
        toWallet: normalizeWallet(THANKEE),
        minLuna: USER_SEND_LUNA,
      })
    ).rejects.toThrow("tx_not_found");
  });

  it("rejects a User Send paid from a different wallet", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (!init || String(init.method || "GET").toUpperCase() !== "POST") {
          return new Response(null, { status: 404 });
        }
        return Response.json(
          nimiqWatchTxEnvelope({ from: "14a404b0f2cc2b70920468e4971874b09477a476" })
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
    ).rejects.toThrow("wrong_send_payer");
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

  it("accepts a User Send when NimiqWatch reports the payer as hex", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (!init || String(init.method || "GET").toUpperCase() !== "POST") {
          return new Response(null, { status: 404 });
        }
        return Response.json(
          nimiqWatchTxEnvelope({
            from: "16b5640b74d571a9fb63c003d65554b70cf0d250",
            recipientData: Buffer.from("Thanks for the rec", "utf8").toString("hex"),
          })
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
    ).resolves.toMatchObject({
      from: normalizeWallet(PAYER),
      to: normalizeWallet(THANKEE),
      memo: "Thanks for the rec",
    });
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
