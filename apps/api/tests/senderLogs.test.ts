import { describe, expect, it } from "vitest";
import {
  filterNimiqConsoleChunk,
  isNimiqConsoleNoise,
  senderConfiguredLine,
  senderConsensusLine,
} from "../src/lib/senderLogs.js";

describe("Sender logs", () => {
  it("keeps Cinima listen and tick-failed lines", () => {
    expect(isNimiqConsoleNoise("[cinima-sender] http://0.0.0.0:8789")).toBe(false);
    expect(isNimiqConsoleNoise("[sender] tick failed Error: boom")).toBe(false);
  });

  it("drops Nimiq WASM worker chatter", () => {
    expect(isNimiqConsoleNoise("Polyfilling WebSocket")).toBe(true);
    expect(isNimiqConsoleNoise("Client WASM worker ready")).toBe(true);
    expect(isNimiqConsoleNoise("Client WASM worker loaded")).toBe(true);
    expect(isNimiqConsoleNoise("Sending NIMIQ_INIT message to client worker")).toBe(true);
    expect(isNimiqConsoleNoise("Initializing client WASM worker")).toBe(true);
    expect(isNimiqConsoleNoise("Have client worker remote")).toBe(true);
  });

  it("drops timestamped Nimiq P2P lines", () => {
    expect(
      isNimiqConsoleNoise(
        "2026-09-11T05:52:31.580000000Z WARN  sync_stream          | Banning peer that replied with a block other than the requested one peer_id=12D3KooWN6U8Ut7T6euRHxGZPLok9HqwYgujqZwC2DdeGmbVHL92"
      )
    ).toBe(true);
    expect(
      isNimiqConsoleNoise(
        "2026-09-11T05:52:31.694000000Z ERROR swarm                | Failed to send request to peer request_id=4 peer_id=12D3KooWN6U8Ut7T6euRHxGZPLok9HqwYgujqZwC2DdeGmbVHL92 connection_id=2 error=Connection was closed before a response was received"
      )
    ).toBe(true);
    expect(
      isNimiqConsoleNoise(
        "2026-09-11T05:53:24.871000000Z WARN  autonat              | Couldn't detect a public reachable address. Validator network operations won't be possible"
      )
    ).toBe(true);
    expect(
      isNimiqConsoleNoise(
        "2026-09-11T05:52:29.582000000Z ERROR bls_cache            | couldn't load keys from idb"
      )
    ).toBe(true);
  });

  it("drops Nimiq WASM stack frames", () => {
    expect(
      isNimiqConsoleNoise(
        "Unable to set event listener for 'message' event: JsValue(TypeError: arg0.addEventListener is not a function"
      )
    ).toBe(true);
    expect(isNimiqConsoleNoise("TypeError: arg0.addEventListener is not a function")).toBe(true);
    expect(
      isNimiqConsoleNoise(
        "    at /app/node_modules/.pnpm/@nimiq+core@2.7.2_vite@6.4.3_@types+node@22.20.1_jiti@2.7.0_tsx@4.23.6_/node_modules/@nimiq/core/nodejs/worker-wasm/index.js:1668:18"
      )
    ).toBe(true);
    expect(isNimiqConsoleNoise("    at wasm://wasm/01d6d19e:wasm-function[868]:0x1cdacd")).toBe(
      true
    );
  });

  it("strips Nimiq lines from a mixed chunk and keeps Cinima", () => {
    const chunk = [
      "Polyfilling WebSocket",
      "[cinima-sender] configured network=mainalbatross address=NQ86 2H86 83VU NQHB JTGT 7CF6 H1G6 U48C EDH9",
      "2026-09-11T05:52:29.580000000Z WARN  bls_cache            | idb: Couldn't create database error=indexed db not found",
      "",
    ].join("\n");
    expect(filterNimiqConsoleChunk(chunk)).toBe(
      "[cinima-sender] configured network=mainalbatross address=NQ86 2H86 83VU NQHB JTGT 7CF6 H1G6 U48C EDH9\n"
    );
  });

  it("drops a Nimiq-only chunk entirely", () => {
    expect(filterNimiqConsoleChunk("Client WASM worker ready\n")).toBe(null);
  });

  it("names network and address when the Sender wallet is configured", () => {
    expect(
      senderConfiguredLine({
        network: "mainalbatross",
        address: "NQ86 2H86 83VU NQHB JTGT 7CF6 H1G6 U48C EDH9",
      })
    ).toBe(
      "[cinima-sender] configured network=mainalbatross address=NQ86 2H86 83VU NQHB JTGT 7CF6 H1G6 U48C EDH9"
    );
  });

  it("names the RPC when the Sender broadcasts through it", () => {
    expect(
      senderConfiguredLine({
        network: "mainalbatross",
        address: "NQ86 2H86 83VU NQHB JTGT 7CF6 H1G6 U48C EDH9",
        rpc: "https://rpc.nimiqwatch.com",
      })
    ).toBe(
      "[cinima-sender] configured network=mainalbatross address=NQ86 2H86 83VU NQHB JTGT 7CF6 H1G6 U48C EDH9 rpc=https://rpc.nimiqwatch.com"
    );
  });

  it("announces when consensus is first established", () => {
    expect(senderConsensusLine()).toBe("[cinima-sender] consensus established");
  });
});
