# Sends run in a dedicated Sender process

Outgoing NIM (Rewards and Pings) must not be signed on the public API: that process is the catalog and social hot path, and a stolen or stalled signer would hit every user. Studio stays a Creator pull read (ADR 0001) and does not hold the key either.

The public API and Studio only enqueue Sends into the shared SQLite queue. A Sender process owns the signer, drains the queue, and plans System Pings. The private key lives only on that process. Local `pnpm dev` may run the Sender in-process (same pattern as Studio inline); Docker runs a third container and blanks the key on API and Studio.

The Sender signs locally with `@nimiq/core` and broadcasts through `NIMIQ_RPC_URL`. It does not run a Nimiq P2P light client and does not wait for consensus per Send: each broadcast is a short HTTP RPC. The signer stays loaded in the Sender process. The drain loop checks the queue every few seconds; System Ping planning stays on a slower timer.

API, Studio, and Sender share one SQLite file. Each process sets WAL and a busy timeout so a Sender SELECT is not `SQLITE_BUSY` the moment the API holds an exclusive lock.

Creator Pings are written on the public API under the Creator wallet (same write-path placement as Door alarm, ADR 0003), then drained by the Sender. Thanks still succeeds when the Sender wallet is empty or unconfigured; the Reward stays queued.
