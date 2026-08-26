<template>
  <div class="testpage">
    <header class="header">
      <h1>Nimiq Pay deep-link lab</h1>
      <p>
        Prefer opening scheme / HTTPS intents from <strong>outside</strong> Pay (Notes, Messages,
        Safari). Tapping <code>nimiqpay://</code> from inside Pay can fail even when the intent is
        fine. Then return here and mark Pass / Fail. Results persist for the next chat.
      </p>
      <p class="meta">
        Effective origin: <code>{{ origin }}</code>
        <template v-if="originOverride.trim()">
          (override; default was <code>{{ defaultOrigin }}</code>)
        </template>
      </p>
      <label class="field">
        <span>Origin override (optional)</span>
        <input
          v-model="originOverride"
          class="nq-input-box"
          spellcheck="false"
          placeholder="e.g. https://abc.ngrok-free.app (no :port)"
        />
      </label>
      <p class="note">
        To isolate port <code>:</code> from path <code>/</code>, tunnel the app on 443/80 (no port
        in the URL) and paste that origin above, then re-run section 0 + host-only intents.
      </p>
      <label class="field">
        <span>Title deep path</span>
        <input v-model="titlePathInput" class="nq-input-box" spellcheck="false" />
      </label>

      <div class="summary-bar">
        <span>{{ summaryLine }}</span>
        <div class="summary-actions">
          <button type="button" class="nq-pill-secondary" @click="copyReport">
            {{ reportCopied ? "Copied report" : "Copy report" }}
          </button>
          <button type="button" class="nq-pill-secondary" @click="clearResults">
            Clear marks
          </button>
        </div>
      </div>
    </header>

    <section v-for="group in groups" :key="group.title" class="group">
      <h2>{{ group.title }}</h2>
      <p v-if="group.note" class="note">{{ group.note }}</p>
      <article
        v-for="link in group.links"
        :key="link.id"
        class="card"
        :data-verdict="results[link.id]?.verdict || ''"
      >
        <div class="card-top">
          <h3>{{ link.label }}</h3>
          <span class="badge" :data-kind="link.kind">{{ link.kind }}</span>
        </div>
        <p class="desc">{{ link.description }}</p>
        <code class="href">{{ link.href }}</code>
        <div class="actions">
          <a class="nq-pill-blue" :href="link.href">Open intent</a>
          <button type="button" class="nq-pill-secondary" @click="copy(link.href, link.id)">
            {{ copiedId === link.id ? "Copied" : "Copy" }}
          </button>
        </div>
        <div class="verdict-row" role="group" :aria-label="`Mark ${link.label}`">
          <button
            type="button"
            class="verdict pass"
            :class="{ on: results[link.id]?.verdict === 'pass' }"
            @click="mark(link, 'pass')"
          >
            Pass
          </button>
          <button
            type="button"
            class="verdict fail"
            :class="{ on: results[link.id]?.verdict === 'fail' }"
            @click="mark(link, 'fail')"
          >
            Fail
          </button>
          <button
            v-if="results[link.id]"
            type="button"
            class="verdict clear"
            @click="unmark(link.id)"
          >
            Clear
          </button>
          <span v-if="results[link.id]" class="verdict-stamp">
            {{ results[link.id]?.verdict === "pass" ? "PASS" : "FAIL" }}
          </span>
        </div>
      </article>
    </section>

    <section class="group">
      <h2>Report for next chat</h2>
      <p class="note">
        Copy this block into the next Cursor chat so the agent can validate encoding conclusions.
      </p>
      <pre class="report">{{ reportMarkdown }}</pre>
      <button type="button" class="nq-pill-blue nq-pill-stretch" @click="copyReport">
        {{ reportCopied ? "Copied report" : "Copy report for chat" }}
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  encodeMiniAppUrlQueryValue,
  nimiqPayMiniAppHttpsUrl,
  nimiqPayMiniAppSchemeUrl,
  payMiniAppHost,
  payMiniAppSchemeTarget,
} from "@cinima/shared";
import { payAppOrigin } from "@/lib/payLinks";

const STORAGE_KEY = "cinima.payDeepLinkLab.results.v2";

type LinkKind = "scheme" | "https" | "control";
type Verdict = "pass" | "fail";

type LabLink = {
  id: string;
  label: string;
  description: string;
  kind: LinkKind;
  href: string;
};

type LabGroup = {
  title: string;
  note?: string;
  links: LabLink[];
};

type StoredResult = {
  id: string;
  label: string;
  kind: LinkKind;
  href: string;
  verdict: Verdict;
  updatedAt: string;
};

/**
 * Encode only the host:port colon (e.g. 192.168.4.73%3A5174).
 * Leaves http:// scheme colon and path slashes unchanged.
 */
function encodeHostPortColonOnly(value: string): string {
  return value.replace(
    /(^|\/\/)([^/:?\s]+):(\d+)/g,
    (_m, prefix: string, hostname: string, port: string) =>
      `${prefix}${hostname}%3A${port}`
  );
}

/** encodeURIComponent, then restore `/` so only `:` (and other reserved) stay encoded. */
function encodeKeepSlashes(value: string): string {
  return encodeURIComponent(value).replace(/%2F/gi, "/");
}

const titlePathInput = ref("/title/movie/700302");
const originOverride = ref("");
const copiedId = ref<string | null>(null);
const reportCopied = ref(false);
const results = ref<Record<string, StoredResult>>(loadResults());

const defaultOrigin = computed(() => payAppOrigin().replace(/\/$/, ""));
const origin = computed(() => {
  const override = originOverride.value.trim().replace(/\/$/, "");
  return override || defaultOrigin.value;
});
const titlePath = computed(() => {
  const raw = titlePathInput.value.trim() || "/title/movie/700302";
  return raw.startsWith("/") ? raw : `/${raw}`;
});
const absoluteTitle = computed(() => `${origin.value}${titlePath.value}`);
const hostOnly = computed(() => payMiniAppHost(origin.value));
const hostWithPath = computed(() => payMiniAppHost(absoluteTitle.value));
const absoluteTarget = computed(() => payMiniAppSchemeTarget(absoluteTitle.value));
const originHasPort = computed(() => /:\d+$/.test(hostOnly.value.split("/")[0] ?? ""));

const controlLinks = computed((): LabLink[] => [
  {
    id: "direct-title",
    label: "Direct title page (control)",
    description: "Open inside an already-running Pay WebView / this browser",
    kind: "control",
    href: absoluteTitle.value,
  },
  {
    id: "direct-origin",
    label: "Direct origin (control)",
    description: "Baseline in-browser open of app root",
    kind: "control",
    href: origin.value,
  },
]);

const groups = computed((): LabGroup[] => {
  const abs = absoluteTitle.value;
  const host = hostOnly.value;
  const hostPath = hostWithPath.value;
  const absTarget = absoluteTarget.value;
  const scheme = (urlParam: string) => `nimiqpay://miniapp?url=${urlParam}`;
  const hostPortEncoded = encodeHostPortColonOnly(host);
  const hostPathPortEncoded = encodeHostPortColonOnly(hostPath);
  const absPortEncoded = encodeHostPortColonOnly(absTarget);

  return [
    {
      title: "0. Port colon isolation (priority)",
      note: originHasPort.value
        ? "Your origin includes :port. Compare literal : vs %3A with / left alone. Also try a no-port tunnel via Origin override."
        : "Origin has no :port — good slash-only check. If host-only passes here but LAN:5174 failed, the port colon was the culprit.",
      links: [
        {
          id: "port-scheme-host-literal",
          label: "Scheme → host, literal :port",
          description: `url=${host} — docs-style; fails if Pay chokes on :port`,
          kind: "scheme",
          href: scheme(host),
        },
        {
          id: "port-scheme-host-pct3a",
          label: "Scheme → host, port as %3A",
          description: `url=${hostPortEncoded} — only the port colon encoded`,
          kind: "scheme",
          href: scheme(hostPortEncoded),
        },
        {
          id: "port-scheme-abs-literal",
          label: "Scheme → absolute title, literal : and /",
          description: `url=${absTarget}`,
          kind: "scheme",
          href: scheme(absTarget),
        },
        {
          id: "port-scheme-abs-port-only",
          label: "Scheme → absolute title, only :port → %3A",
          description: `url=${absPortEncoded} — / stays literal; http:// colon stays`,
          kind: "scheme",
          href: scheme(absPortEncoded),
        },
        {
          id: "port-scheme-abs-all-colons",
          label: "Scheme → absolute title, all : → %3A, / literal",
          description: "http%3A//host%3Aport/path… — isolates colon vs slash",
          kind: "scheme",
          href: scheme(encodeKeepSlashes(absTarget)),
        },
        {
          id: "port-scheme-hostpath-port-only",
          label: "Scheme → host+path, only :port → %3A",
          description: `url=${hostPathPortEncoded}`,
          kind: "scheme",
          href: scheme(hostPathPortEncoded),
        },
        {
          id: "port-https-host-literal",
          label: "HTTPS open/ + host, literal :port",
          description: "Baseline HTTPS intent with port",
          kind: "https",
          href: `https://nimpay.app/miniapps/open/${host}`,
        },
        {
          id: "port-https-host-pct3a",
          label: "HTTPS open/ + host, port as %3A",
          description: `…/open/${hostPortEncoded}`,
          kind: "https",
          href: `https://nimpay.app/miniapps/open/${hostPortEncoded}`,
        },
        {
          id: "port-https-hostpath-port-only",
          label: "HTTPS open/ + host+path, only :port → %3A",
          description: `…/open/${hostPathPortEncoded}`,
          kind: "https",
          href: `https://nimpay.app/miniapps/open/${hostPathPortEncoded}`,
        },
      ],
    },
    {
      title: "0b. IP vs hostname probes",
      note:
        "Bare LAN IP (no :port) checks whether Pay blocks IP hosts. cinima.app:5174 checks :port on a hostname (not an IP).",
      links: [
        {
          id: "probe-scheme-lan-ip-bare",
          label: "Scheme → 192.168.4.73 (no port)",
          description: "url=192.168.4.73 — IP only; isolates IP block vs :port",
          kind: "scheme",
          href: scheme("192.168.4.73"),
        },
        {
          id: "probe-https-lan-ip-bare",
          label: "HTTPS open/ → 192.168.4.73 (no port)",
          description: "…/open/192.168.4.73",
          kind: "https",
          href: "https://nimpay.app/miniapps/open/192.168.4.73",
        },
        {
          id: "probe-scheme-lan-ip-http",
          label: "Scheme → http://192.168.4.73/",
          description: "Absolute URL with IP, default port 80 implied (no : in host)",
          kind: "scheme",
          href: scheme("http://192.168.4.73/"),
        },
        {
          id: "probe-scheme-cinima-port",
          label: "Scheme → cinima.app:5174",
          description: "Hostname + :port — if this fails and bare IP passes, colon is the issue",
          kind: "scheme",
          href: scheme("cinima.app:5174"),
        },
        {
          id: "probe-scheme-cinima-port-pct3a",
          label: "Scheme → cinima.app%3A5174",
          description: "Same host with only port colon encoded",
          kind: "scheme",
          href: scheme("cinima.app%3A5174"),
        },
        {
          id: "probe-https-cinima-port",
          label: "HTTPS open/ → cinima.app:5174",
          description: "…/open/cinima.app:5174",
          kind: "https",
          href: "https://nimpay.app/miniapps/open/cinima.app:5174",
        },
        {
          id: "probe-https-cinima-port-pct3a",
          label: "HTTPS open/ → cinima.app%3A5174",
          description: "…/open/cinima.app%3A5174",
          kind: "https",
          href: "https://nimpay.app/miniapps/open/cinima.app%3A5174",
        },
        {
          id: "probe-scheme-cinima-prod",
          label: "Scheme → cinima.app (prod host, no port)",
          description: "Hostname-only baseline that already works on prod",
          kind: "scheme",
          href: scheme("cinima.app"),
        },
      ],
    },
    {
      title: "A. Current Cinima builders",
      note: "What the app generates today for Already Installed / title deep links.",
      links: [
        {
          id: "builder-origin-scheme",
          label: "Scheme → origin only",
          description: "nimiqPayMiniAppSchemeUrl(origin)",
          kind: "scheme",
          href: nimiqPayMiniAppSchemeUrl(origin.value),
        },
        {
          id: "builder-title-scheme",
          label: "Scheme → title deep link",
          description: "nimiqPayMiniAppSchemeUrl(absolute title) — : and / left literal",
          kind: "scheme",
          href: nimiqPayMiniAppSchemeUrl(abs),
        },
        {
          id: "builder-title-https",
          label: "HTTPS open/ → title path",
          description: "nimiqPayMiniAppHttpsUrl(absolute title)",
          kind: "https",
          href: nimiqPayMiniAppHttpsUrl(abs),
        },
        {
          id: "builder-origin-https",
          label: "HTTPS open/ → origin",
          description: "nimiqPayMiniAppHttpsUrl(origin)",
          kind: "https",
          href: nimiqPayMiniAppHttpsUrl(origin.value),
        },
      ],
    },
    {
      title: "B. Scheme url= encoding matrix (title page)",
      note: "Compare full encodeURIComponent vs literal / and :. Main Pay bug check.",
      links: [
        {
          id: "scheme-abs-literal",
          label: "Absolute URL, literal / and :",
          description: `url=${absTarget} (current preferred)`,
          kind: "scheme",
          href: scheme(encodeMiniAppUrlQueryValue(absTarget)),
        },
        {
          id: "scheme-abs-full-encode",
          label: "Absolute URL, full encodeURIComponent",
          description: "Slashes become %2F — suspected broken",
          kind: "scheme",
          href: scheme(encodeURIComponent(absTarget)),
        },
        {
          id: "scheme-hostpath-literal",
          label: "Host+path, literal / and :",
          description: `url=${hostPath} (no http://)`,
          kind: "scheme",
          href: scheme(encodeMiniAppUrlQueryValue(hostPath)),
        },
        {
          id: "scheme-hostpath-full-encode",
          label: "Host+path, full encodeURIComponent",
          description: "No scheme; slashes %2F",
          kind: "scheme",
          href: scheme(encodeURIComponent(hostPath)),
        },
        {
          id: "scheme-host-only",
          label: "Host only (baseline)",
          description: `url=${host} — should open mini app root`,
          kind: "scheme",
          href: scheme(encodeMiniAppUrlQueryValue(host)),
        },
        {
          id: "scheme-host-full-encode",
          label: "Host only, encodeURIComponent",
          description: "Colon in port becomes %3A",
          kind: "scheme",
          href: scheme(encodeURIComponent(host)),
        },
      ],
    },
    {
      title: "C. HTTPS nimpay.app/miniapps/open/ matrix",
      links: [
        {
          id: "https-host",
          label: "open/ + host",
          description: "Baseline open intent",
          kind: "https",
          href: `https://nimpay.app/miniapps/open/${host}`,
        },
        {
          id: "https-hostpath",
          label: "open/ + host + title path",
          description: "Path after open/ without encoding",
          kind: "https",
          href: `https://nimpay.app/miniapps/open/${hostPath}`,
        },
        {
          id: "https-hostpath-encoded",
          label: "open/ + encodeURIComponent(host+path)",
          description: "Entire host/path encoded as one segment",
          kind: "https",
          href: `https://nimpay.app/miniapps/open/${encodeURIComponent(hostPath)}`,
        },
      ],
    },
    {
      title: "D. Extra path shapes",
      links: [
        {
          id: "scheme-discover",
          label: "Scheme → /discover",
          description: "Non-title in-app route",
          kind: "scheme",
          href: nimiqPayMiniAppSchemeUrl(`${origin.value}/discover`),
        },
        {
          id: "scheme-query-next",
          label: "Scheme → /?next=/title/...",
          description: "Query-param carrier instead of path",
          kind: "scheme",
          href: nimiqPayMiniAppSchemeUrl(
            `${origin.value}/?next=${encodeURIComponent(titlePath.value)}`
          ),
        },
        {
          id: "scheme-hash",
          label: "Scheme → /#/title/...",
          description: "Hash carrier (app uses history mode; may not route)",
          kind: "scheme",
          href: nimiqPayMiniAppSchemeUrl(`${origin.value}/#${titlePath.value}`),
        },
      ],
    },
    {
      title: "E. Direct in-app URLs (control)",
      note: "If these pass inside Pay but encoded intents fail, that points at Pay intent decoding.",
      links: controlLinks.value,
    },
  ];
});

const allLinks = computed(() => groups.value.flatMap((g) => g.links));

const summaryLine = computed(() => {
  const rows = Object.values(results.value);
  const pass = rows.filter((r) => r.verdict === "pass").length;
  const fail = rows.filter((r) => r.verdict === "fail").length;
  const total = allLinks.value.length;
  return `${pass} pass · ${fail} fail · ${total - pass - fail} unmarked / ${total}`;
});

const reportMarkdown = computed(() => {
  const lines = [
    "## Nimiq Pay deep-link lab results",
    "",
    `- Effective origin: \`${origin.value}\``,
    `- Default origin: \`${defaultOrigin.value}\``,
    `- Origin override: \`${originOverride.value.trim() || "(none)"}\``,
    `- Origin has :port: ${originHasPort.value ? "yes" : "no"}`,
    `- Title path: \`${titlePath.value}\``,
    `- Absolute title: \`${absoluteTitle.value}\``,
    `- Recorded: ${new Date().toISOString()}`,
    `- Note: open scheme/https intents from outside Pay when possible`,
    "",
    "| Verdict | Id | Label | Kind | Href |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const link of allLinks.value) {
    const row = results.value[link.id];
    const verdict = row?.verdict?.toUpperCase() ?? "UNMARKED";
    lines.push(
      `| ${verdict} | \`${link.id}\` | ${link.label.replace(/\|/g, "/")} | ${link.kind} | \`${link.href.replace(/\|/g, "%7C")}\` |`
    );
  }
  lines.push("");
  lines.push("### Encoding conclusions (fill if known)");
  lines.push("- Literal `:port` in url= / open/ :");
  lines.push("- Port as `%3A` only (slashes literal) :");
  lines.push("- Bare LAN IP `192.168.4.73` (no port) :");
  lines.push("- `cinima.app:5174` (hostname + port) :");
  lines.push("- No-port tunnel origin :");
  lines.push("- Literal `/` in path :");
  lines.push("- Full `encodeURIComponent` (%2F) :");
  lines.push("- Opened intents from outside Pay? :");
  lines.push("");
  return lines.join("\n");
});

watch(
  results,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // ignore
    }
  },
  { deep: true }
);

function loadResults(): Record<string, StoredResult> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredResult>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function mark(link: LabLink, verdict: Verdict) {
  results.value = {
    ...results.value,
    [link.id]: {
      id: link.id,
      label: link.label,
      kind: link.kind,
      href: link.href,
      verdict,
      updatedAt: new Date().toISOString(),
    },
  };
}

function unmark(id: string) {
  const next = { ...results.value };
  delete next[id];
  results.value = next;
}

function clearResults() {
  results.value = {};
}

async function copy(text: string, id: string) {
  try {
    await navigator.clipboard.writeText(text);
    copiedId.value = id;
    window.setTimeout(() => {
      copiedId.value = null;
    }, 1400);
  } catch {
    copiedId.value = null;
  }
}

async function copyReport() {
  try {
    await navigator.clipboard.writeText(reportMarkdown.value);
    reportCopied.value = true;
    window.setTimeout(() => {
      reportCopied.value = false;
    }, 1600);
  } catch {
    reportCopied.value = false;
  }
}
</script>

<style scoped>
.testpage {
  position: relative;
  z-index: 1;
  height: 100dvh;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  padding: 1.25rem 1.25rem calc(3rem + env(safe-area-inset-bottom, 0px));
  color: var(--text-primary);
  max-width: 40rem;
  margin-inline: auto;
  box-sizing: border-box;
}

.header {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-bottom: 1.5rem;
}

.header h1 {
  margin: 0;
  font-size: 1.35rem;
}

.header p,
.note {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.45;
}

.meta {
  font-size: 0.85rem !important;
}

.meta code,
.href {
  display: block;
  word-break: break-all;
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--gold);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.field input {
  font-weight: 500;
}

.summary-bar {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.75rem 0.85rem;
  border-radius: 0.75rem;
  background: var(--colors-neutral-200);
  font-size: 0.9rem;
  font-weight: 600;
}

.summary-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.75rem;
}

.group h2 {
  margin: 0;
  font-size: 1.05rem;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--border);
  border-radius: 0.85rem;
  background: color-mix(in oklch, var(--bg-surface) 88%, transparent);
}

.card[data-verdict="pass"] {
  border-color: color-mix(in oklch, var(--success, #3ecf8e) 55%, var(--border));
}

.card[data-verdict="fail"] {
  border-color: color-mix(in oklch, var(--error, #e74c3c) 55%, var(--border));
}

.card-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.card h3 {
  margin: 0;
  font-size: 0.95rem;
}

.badge {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.badge[data-kind="scheme"] {
  color: var(--gold);
}

.badge[data-kind="https"] {
  color: var(--primary);
}

.desc {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.35;
}

.actions,
.verdict-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.actions a,
.actions button,
.verdict-row button {
  text-decoration: none;
  cursor: pointer;
  font: inherit;
}

.verdict {
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 700;
}

.verdict.pass.on {
  border-color: var(--success, #3ecf8e);
  background: color-mix(in oklch, var(--success, #3ecf8e) 22%, transparent);
  color: #fff;
}

.verdict.fail.on {
  border-color: var(--error, #e74c3c);
  background: color-mix(in oklch, var(--error, #e74c3c) 22%, transparent);
  color: #fff;
}

.verdict.clear {
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 600;
}

.verdict-stamp {
  margin-left: auto;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.card[data-verdict="pass"] .verdict-stamp {
  color: var(--success, #3ecf8e);
}

.card[data-verdict="fail"] .verdict-stamp {
  color: var(--error, #e74c3c);
}

.report {
  margin: 0;
  padding: 0.85rem;
  border-radius: 0.75rem;
  background: var(--colors-neutral-200);
  color: var(--text-secondary);
  font-size: 0.72rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 16rem;
  overflow: auto;
}
</style>
