const CINIMA_LINE = /\[cinima-|\[sender\]/;

const NIMIQ_NOISE = [
  /^Polyfilling WebSocket/i,
  /^Client WASM worker/i,
  /^Sending NIMIQ_INIT/i,
  /^Initializing client WASM worker/i,
  /^Have client worker remote/i,
  /^\d{4}-\d{2}-\d{2}T\S+\s+(TRACE|DEBUG|INFO|WARN|ERROR)\s+/,
  /Unable to set event listener for 'message' event/,
  /^TypeError: arg0\.addEventListener is not a function/,
  /addEventListener is not a function/,
  /indexed db not found/i,
  /couldn't load keys from idb/i,
  /@nimiq\+core@/,
  /@nimiq\/core/,
  /nodejs\/worker-wasm/,
  /wasm:\/\//,
  /^at wasm_bindgen_/,
  /^at __wbg_/,
  /^at handleError \(/,
  /^at real \(/,
  /^◇ injected env/,
  /suppress logs \{ quiet: true \}/,
];

export function isNimiqConsoleNoise(line: string): boolean {
  if (CINIMA_LINE.test(line)) return false;
  const trimmed = line.trim();
  if (!trimmed) return true;
  return NIMIQ_NOISE.some((re) => re.test(trimmed));
}

export function filterNimiqConsoleChunk(chunk: string): string | null {
  const endsWithNl = chunk.endsWith("\n");
  const lines = chunk.split("\n");
  const kept = lines.filter((line, i) => {
    if (i === lines.length - 1 && line === "" && endsWithNl) return false;
    return !isNimiqConsoleNoise(line);
  });
  if (kept.length === 0) return null;
  let out = kept.join("\n");
  if (endsWithNl && !out.endsWith("\n")) out += "\n";
  return out;
}

export function senderConfiguredLine(opts: { network: string; address: string }): string {
  return `[cinima-sender] configured network=${opts.network} address=${opts.address}`;
}

export function senderConsensusLine(): string {
  return `[cinima-sender] consensus established`;
}

let filterInstalled = false;

export function installNimiqConsoleFilter(): void {
  if (filterInstalled) return;
  filterInstalled = true;
  wrapStream(process.stdout);
  wrapStream(process.stderr);
}

function wrapStream(stream: NodeJS.WriteStream): void {
  const orig = stream.write.bind(stream) as (
    chunk: unknown,
    encoding?: unknown,
    cb?: unknown
  ) => boolean;
  stream.write = ((chunk: unknown, encoding?: unknown, cb?: unknown) => {
    const encodingIsFn = typeof encoding === "function";
    const callback = encodingIsFn ? encoding : typeof cb === "function" ? cb : undefined;
    const enc = encodingIsFn ? undefined : encoding;
    const text =
      typeof chunk === "string"
        ? chunk
        : Buffer.isBuffer(chunk) || chunk instanceof Uint8Array
          ? Buffer.from(chunk).toString(typeof enc === "string" ? (enc as BufferEncoding) : "utf8")
          : String(chunk);
    const filtered = filterNimiqConsoleChunk(text);
    if (filtered == null) {
      if (typeof callback === "function") callback();
      return true;
    }
    if (typeof enc === "string") return orig(filtered, enc, callback);
    return orig(filtered, callback);
  }) as typeof stream.write;
}
