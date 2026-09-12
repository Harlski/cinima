import { senderConfiguredLine, senderConsensusLine } from "../lib/senderLogs.js";
import { nimiqRpcCall } from "../lib/nimiqRpc.js";

export type ChainSend = {
  to: string;
  luna: number;
  memo: string;
};

export type ChainAdapter = {
  configured(): boolean;
  balanceLuna(): Promise<bigint>;
  send(tx: ChainSend): Promise<{ txHash: string }>;
};

export type NimiqRpcFn = (method: string, params?: unknown[]) => Promise<unknown>;

const NETWORK_IDS: Record<string, number> = {
  mainalbatross: 24,
  testalbatross: 5,
  devalbatross: 1,
};

export function nimiqNetworkId(network: string): number {
  return NETWORK_IDS[network.trim().toLowerCase()] ?? 24;
}

export function createMemoryChain(opts?: {
  balanceLuna?: bigint;
  fail?: boolean;
}): ChainAdapter & { sent: ChainSend[] } {
  const sent: ChainSend[] = [];
  let balance = opts?.balanceLuna ?? 10_000_000n;
  return {
    sent,
    configured: () => true,
    async balanceLuna() {
      return balance;
    },
    async send(tx) {
      if (opts?.fail) throw new Error("chain_fail");
      const need = BigInt(tx.luna);
      if (need > balance) throw new Error("insufficient_balance");
      balance -= need;
      sent.push(tx);
      return { txHash: `demo:${sent.length}` };
    },
  };
}

export function createUnconfiguredChain(): ChainAdapter {
  return {
    configured: () => false,
    async balanceLuna() {
      return 0n;
    },
    async send() {
      throw new Error("sender_unconfigured");
    },
  };
}

export async function createNimiqChain(opts: {
  privateKey: string;
  network: string;
  rpcUrl: string;
  rpc?: NimiqRpcFn;
}): Promise<ChainAdapter> {
  const Nimiq = await import("@nimiq/core");
  const hex = opts.privateKey.trim();
  const keyPair = Nimiq.KeyPair.derive(Nimiq.PrivateKey.fromHex(hex));
  const address = keyPair.toAddress().toUserFriendlyAddress();
  const rpcUrl = opts.rpcUrl.replace(/\/$/, "");
  const rpc: NimiqRpcFn =
    opts.rpc ?? ((method, params) => nimiqRpcCall(rpcUrl, method, params ?? []));
  const networkId = nimiqNetworkId(opts.network);
  console.log(senderConfiguredLine({ network: opts.network, address, rpc: rpcUrl }));

  let mutex: Promise<void> = Promise.resolve();
  let consensusLogged = false;
  const markReady = () => {
    if (consensusLogged) return;
    consensusLogged = true;
    console.log(senderConsensusLine());
  };
  const withMutex = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = mutex.then(fn);
    mutex = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  };

  const readBalance = async (): Promise<bigint> => {
    const account = await rpc("getAccountByAddress", [address]);
    markReady();
    if (!account || typeof account !== "object") return 0n;
    const balance = (account as { balance?: unknown }).balance;
    if (balance == null) return 0n;
    return BigInt(balance as number | string | bigint);
  };

  return {
    configured: () => true,
    async balanceLuna() {
      return withMutex(readBalance);
    },
    async send(tx) {
      return withMutex(async () => {
        const balance = await readBalance();
        const need = BigInt(tx.luna);
        if (need > balance) throw new Error("insufficient_balance");
        const height = Number(await rpc("getBlockNumber"));
        if (!Number.isFinite(height) || height <= 0) {
          throw new Error("rpc_invalid_height");
        }
        const built = Nimiq.TransactionBuilder.newBasicWithData(
          keyPair.toAddress(),
          Nimiq.Address.fromUserFriendlyAddress(tx.to),
          new TextEncoder().encode(tx.memo),
          need,
          null,
          height,
          networkId
        );
        built.sign(keyPair, undefined);
        const submitted = await rpc("sendRawTransaction", [built.toHex()]);
        const txHash = typeof submitted === "string" && submitted ? submitted : built.hash();
        return { txHash };
      });
    },
  };
}
