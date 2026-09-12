import { afterEach, describe, expect, it, vi } from "vitest";
import { createNimiqChain, nimiqNetworkId } from "../src/services/sendsChain.js";

const PRIVATE_KEY = "11".repeat(32);
const SENDER_ADDRESS = "NQ21 SEXP BY6P CVJG 8RQX UVFR BQFD FBD6 S5LD";
const RECIPIENT = "NQ07 0000 0000 0000 0000 0000 0000 0000 0000";

describe("Nimiq network id", () => {
  it("maps Albatross names to protocol ids", () => {
    expect(nimiqNetworkId("mainalbatross")).toBe(24);
    expect(nimiqNetworkId("TestAlbatross")).toBe(5);
  });
});

describe("Nimiq RPC chain", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads balance from RPC and logs consensus without a P2P client", async () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    });
    const rpc = vi.fn(async (method: string) => {
      if (method === "getAccountByAddress") {
        return { address: SENDER_ADDRESS, balance: 250_000, type: "basic" };
      }
      throw new Error(`unexpected ${method}`);
    });

    const chain = await createNimiqChain({
      privateKey: PRIVATE_KEY,
      network: "mainalbatross",
      rpcUrl: "https://rpc.example.test",
      rpc,
    });

    expect(chain.configured()).toBe(true);
    expect(await chain.balanceLuna()).toBe(250_000n);
    expect(rpc).toHaveBeenCalledWith("getAccountByAddress", [SENDER_ADDRESS]);
    expect(logs).toContain(
      `[cinima-sender] configured network=mainalbatross address=${SENDER_ADDRESS} rpc=https://rpc.example.test`
    );
    expect(logs).toContain("[cinima-sender] consensus established");
  }, 15_000);

  it("broadcasts a signed raw transaction over RPC", async () => {
    const rpc = vi.fn(async (method: string) => {
      if (method === "getAccountByAddress") {
        return { address: SENDER_ADDRESS, balance: 250_000, type: "basic" };
      }
      if (method === "getBlockNumber") return 61366412;
      if (method === "sendRawTransaction") return "aa".repeat(32);
      throw new Error(`unexpected ${method}`);
    });

    const chain = await createNimiqChain({
      privateKey: PRIVATE_KEY,
      network: "mainalbatross",
      rpcUrl: "https://rpc.example.test",
      rpc,
    });

    const result = await chain.send({
      to: RECIPIENT,
      luna: 10,
      memo: "Cinima.app - Sender test",
    });
    expect(result.txHash).toBe("aa".repeat(32));
    const sendCall = rpc.mock.calls.find((c) => c[0] === "sendRawTransaction");
    expect(sendCall?.[1]?.[0]).toMatch(/^[0-9a-f]+$/i);
    expect(String(sendCall?.[1]?.[0]).length).toBeGreaterThan(64);

    await chain.send({
      to: RECIPIENT,
      luna: 10,
      memo: "Cinima.app - second",
    });
    expect(rpc.mock.calls.filter((c) => c[0] === "getBlockNumber")).toHaveLength(1);
    expect(rpc.mock.calls.filter((c) => c[0] === "sendRawTransaction")).toHaveLength(2);
  }, 15_000);

  it("refuses to send when the Sender wallet is empty", async () => {
    const rpc = vi.fn(async (method: string) => {
      if (method === "getAccountByAddress") {
        return { address: SENDER_ADDRESS, balance: 0, type: "basic" };
      }
      throw new Error(`unexpected ${method}`);
    });

    const chain = await createNimiqChain({
      privateKey: PRIVATE_KEY,
      network: "mainalbatross",
      rpcUrl: "https://rpc.example.test",
      rpc,
    });

    await expect(
      chain.send({ to: RECIPIENT, luna: 10, memo: "Cinima.app - Sender test" })
    ).rejects.toThrow("insufficient_balance");
    expect(rpc.mock.calls.some((c) => c[0] === "sendRawTransaction")).toBe(false);
  }, 15_000);
});
