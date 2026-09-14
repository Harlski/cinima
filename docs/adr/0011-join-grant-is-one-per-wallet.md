# Join grant is one per wallet, not per device

Cinima has no device or Pay-install id, and a WebView fingerprint would reset on reinstall and fail to stop a second wallet on the same phone. The Join grant is therefore one 10 NIM Send per wallet, forever, locked by Sender idempotency. Anti-sybil pressure, if needed later, should be a verifiable product gate (Handle, Guided tour), not a pretended device id.
