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
}): Promise<ChainAdapter> {
  const Nimiq = await import("@nimiq/core");
  const hex = opts.privateKey.trim();
  const keyPair = Nimiq.KeyPair.derive(Nimiq.PrivateKey.fromHex(hex));
  const cfg = new Nimiq.ClientConfiguration();
  cfg.network(opts.network);
  cfg.logLevel("warn");
  const client = await Nimiq.Client.create(cfg.build());
  let mutex: Promise<void> = Promise.resolve();
  const withMutex = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = mutex.then(fn);
    mutex = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  };
  return {
    configured: () => true,
    async balanceLuna() {
      return withMutex(async () => {
        await client.waitForConsensusEstablished();
        const account = await client.getAccount(keyPair.toAddress());
        return BigInt(account.balance);
      });
    },
    async send(tx) {
      return withMutex(async () => {
        await client.waitForConsensusEstablished();
        const recipient = Nimiq.Address.fromUserFriendlyAddress(tx.to);
        const head = await client.getHeadBlock();
        const networkId = await client.getNetworkId();
        const built = Nimiq.TransactionBuilder.newBasicWithData(
          keyPair.toAddress(),
          recipient,
          new TextEncoder().encode(tx.memo),
          BigInt(tx.luna),
          null,
          head.height,
          networkId
        );
        built.sign(keyPair, undefined);
        const details = await client.sendTransaction(built);
        return { txHash: details.transactionHash };
      });
    },
  };
}
