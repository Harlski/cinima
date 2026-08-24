<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { headerPosters, assignUniqueHeaderPosters, hexIntersectsBounds, labTmdbPosterSrc } from "../../lib/headerPosters";
import {
  defaultFlatTopHexRows,
  flatTopHexGridSpacing,
  flatTopHexSvgPath,
  layoutFlatTopHoneycomb,
  resolveFlatTopHexGridMetrics,
  validateFlatTopHexGrid,
  type FlatTopHexCell,
  type FlatTopHexGridOptions,
  type FlatTopHexRowConfig,
} from "../../lib/flatTopHexGrid";

const STORAGE_KEY = "cinima-x-header-lab-v2";

const BANNER_W = 1500;
const BANNER_H = 500;
const BG = "#1c1f33";
const GOLD = "#E5C158";

type LabRow = {
  id: number;
  y: number;
  enabled: boolean;
  originX: number;
  offsetX: number;
  colPitch: number | null;
  colMin: number | null;
  colMax: number | null;
};

type LabParams = {
  radius: number;
  gap: number;
  originX: number;
  colMin: number;
  colMax: number | null;
  strokeWidth: number;
  inset: number;
  showPosters: boolean;
  rows: LabRow[];
};

function buildHoneycombRows(
  partial: Pick<LabParams, "radius" | "gap" | "originX">
): LabRow[] {
  const base: FlatTopHexGridOptions = {
    radius: partial.radius,
    gap: partial.gap,
    bounds: { width: BANNER_W, height: BANNER_H },
    originX: partial.originX,
    bleedRows: 2,
    rowMin: -2,
    rowMax: 3,
    colMin: -1,
  };
  return defaultFlatTopHexRows(base).map((r) => ({
    id: r.id,
    y: r.y,
    enabled: true,
    originX: r.originX ?? partial.originX,
    offsetX: r.offsetX ?? 0,
    colPitch: null,
    colMin: null,
    colMax: null,
  }));
}

const defaults: LabParams = {
  radius: 128,
  gap: 30,
  originX: -32,
  colMin: -1,
  colMax: null,
  strokeWidth: 2.5,
  inset: 1.2,
  showPosters: true,
  rows: buildHoneycombRows({ radius: 128, gap: 30, originX: -32 }),
};

const p = reactive<LabParams>(structuredClone(defaults));
const copied = ref(false);
const saving = ref(false);
const saveError = ref<string | null>(null);
const selectedRowIdx = ref(0);

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<LabParams>;
      Object.assign(p, { ...defaults, ...saved });
      if (!saved.rows?.length) {
        p.rows = buildHoneycombRows(p);
      }
    }
  } catch {
    /* ignore */
  }
});

watch(
  p,
  () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  },
  { deep: true }
);

const autoColPitch = computed(
  () => flatTopHexGridSpacing(p.radius, p.gap).colPitch
);

const gridOpts = computed((): FlatTopHexGridOptions => {
  const rows: FlatTopHexRowConfig[] = p.rows.map((row) => ({
    id: row.id,
    y: row.y,
    enabled: row.enabled,
    originX: row.originX,
    offsetX: row.offsetX,
    colPitch: row.colPitch ?? undefined,
    colMin: row.colMin ?? undefined,
    colMax: row.colMax ?? undefined,
  }));

  return {
    radius: p.radius,
    gap: p.gap,
    bounds: { width: BANNER_W, height: BANNER_H },
    originX: p.originX,
    colMin: p.colMin,
    colMax: p.colMax ?? undefined,
    rows,
  };
});

const cells = computed(() => layoutFlatTopHoneycomb(gridOpts.value));
const metrics = computed(() => resolveFlatTopHexGridMetrics(gridOpts.value));
const validation = computed(() =>
  validateFlatTopHexGrid(cells.value, gridOpts.value, p.inset)
);
const posterByCell = computed(() =>
  assignUniqueHeaderPosters(cells.value, p.radius, {
    width: BANNER_W,
    height: BANNER_H,
  })
);
const uniquePosterCount = computed(
  () => posterByCell.value.filter((poster) => poster != null).length
);
const visibleCellCount = computed(
  () =>
    cells.value.filter((c) =>
      hexIntersectsBounds(c.center, p.radius, {
        width: BANNER_W,
        height: BANNER_H,
      })
    ).length
);

const exportConfig = computed(() =>
  JSON.stringify(
    {
      radius: p.radius,
      gap: p.gap,
      originX: p.originX,
      colMin: p.colMin,
      colMax: p.colMax ?? undefined,
      strokeWidth: p.strokeWidth,
      inset: p.inset,
      rows: p.rows.map((row) => ({
        id: row.id,
        y: row.y,
        enabled: row.enabled,
        originX: row.originX,
        offsetX: row.offsetX,
        colPitch: row.colPitch ?? undefined,
        colMin: row.colMin ?? undefined,
        colMax: row.colMax ?? undefined,
      })),
    },
    null,
    2
  )
);

const previewSvg = computed(() => {
  const r = p.radius - p.inset;
  const hexW = metrics.value.width;
  const hexH = metrics.value.height;
  const posters = posterByCell.value;

  const defs: string[] = [];
  const shapes: string[] = [];

  cells.value.forEach((cell: FlatTopHexCell, i: number) => {
    const path = flatTopHexSvgPath(cell.center, r);
    const clipId = `hex-${i}`;
    defs.push(`<clipPath id="${clipId}"><path d="${path}"/></clipPath>`);

    const poster = posters[i];
    if (p.showPosters && poster) {
      const x = cell.center.x - hexW / 2;
      const y = cell.center.y - hexH / 2;
      shapes.push(
        `<image href="${labTmdbPosterSrc(poster.posterPath)}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${hexW.toFixed(1)}" height="${hexH.toFixed(1)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`
      );
      shapes.push(
        `<path d="${path}" fill="none" stroke="${GOLD}" stroke-width="${p.strokeWidth}" stroke-linejoin="round"/>`
      );
      return;
    }

    shapes.push(
      `<path d="${path}" fill="${BG}" stroke="${GOLD}" stroke-width="${p.strokeWidth}" stroke-linejoin="round"/>`
    );
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BANNER_W} ${BANNER_H}" width="${BANNER_W}" height="${BANNER_H}">
  <rect width="100%" height="100%" fill="${BG}"/>
  <defs>${defs.join("")}</defs>
  ${shapes.join("\n  ")}
</svg>`;
});

function resetDefaults() {
  Object.assign(p, structuredClone(defaults));
  selectedRowIdx.value = 0;
}

function resetRowsFromHoneycomb() {
  p.rows = buildHoneycombRows(p);
  selectedRowIdx.value = 0;
}

function addRow() {
  const last = p.rows[p.rows.length - 1];
  const rowPitch = metrics.value.rowPitch;
  const nextId = last ? last.id + 1 : 0;
  p.rows.push({
    id: nextId,
    y: last ? last.y + rowPitch : BANNER_H / 2,
    enabled: true,
    originX: p.originX,
    offsetX: 0,
    colPitch: null,
    colMin: null,
    colMax: null,
  });
  selectedRowIdx.value = p.rows.length - 1;
}

function removeRow(idx: number) {
  if (p.rows.length <= 1) return;
  p.rows.splice(idx, 1);
  selectedRowIdx.value = Math.min(selectedRowIdx.value, p.rows.length - 1);
}

function applyGlobalOriginToAllRows() {
  for (const row of p.rows) {
    row.originX = p.originX;
  }
}

async function copyConfig() {
  await navigator.clipboard.writeText(exportConfig.value);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1500);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

/** Inline remote <image> hrefs so canvas export matches the live preview. */
async function inlineSvgImages(svgMarkup: string): Promise<string> {
  const doc = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  const images = Array.from(doc.querySelectorAll("image"));
  await Promise.all(
    images.map(async (img) => {
      const href =
        img.getAttribute("href") ||
        img.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if (!href || href.startsWith("data:")) return;
      try {
        const res = await fetch(href);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const dataUrl = await blobToDataUrl(await res.blob());
        img.setAttribute("href", dataUrl);
        img.removeAttributeNS("http://www.w3.org/1999/xlink", "href");
      } catch {
        // Drop broken remote images so export still matches filled tiles.
        img.remove();
      }
    })
  );
  return new XMLSerializer().serializeToString(doc.documentElement);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to rasterize SVG"));
    img.src = src;
  });
}

/** Download the exact live preview as a 1500×500 PNG. */
async function savePng() {
  if (saving.value) return;
  saving.value = true;
  saveError.value = null;
  let objectUrl: string | null = null;
  try {
    const inlined = await inlineSvgImages(previewSvg.value);
    const blob = new Blob([inlined], { type: "image/svg+xml;charset=utf-8" });
    objectUrl = URL.createObjectURL(blob);
    const img = await loadImage(objectUrl);

    const canvas = document.createElement("canvas");
    canvas.width = BANNER_W;
    canvas.height = BANNER_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, BANNER_W, BANNER_H);
    ctx.drawImage(img, 0, 0, BANNER_W, BANNER_H);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))),
        "image/png"
      );
    });

    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(pngBlob);
    a.download = `cinima-x-header-${stamp}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    saveError.value =
      err instanceof Error ? err.message : "Failed to save PNG";
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    saving.value = false;
  }
}

const activeRow = computed(() => p.rows[selectedRowIdx.value]);
</script>

<template>
  <div class="lab">
    <header class="lab-header">
      <h1>X header hex lab</h1>
      <p>Each row is independent. Live preview at 1500×500.</p>
    </header>

    <div class="lab-body">
      <aside class="controls">
        <section>
          <h2>Hex (global)</h2>
          <label>
            Radius
            <input v-model.number="p.radius" type="range" min="60" max="180" step="1" />
            <span>{{ p.radius }}px</span>
          </label>
          <label>
            Gap
            <input v-model.number="p.gap" type="range" min="0" max="400" step="1" />
            <input v-model.number="p.gap" type="number" min="0" max="1000" step="1" />
            <span>{{ p.gap }}px</span>
          </label>
          <label>
            Stroke
            <input v-model.number="p.strokeWidth" type="range" min="1" max="8" step="0.5" />
            <span>{{ p.strokeWidth }}px</span>
          </label>
          <label>
            Inset
            <input v-model.number="p.inset" type="range" min="0" max="6" step="0.1" />
            <span>{{ p.inset }}px</span>
          </label>
          <label class="check">
            <input v-model="p.showPosters" type="checkbox" />
            Show title posters
          </label>
        </section>

        <section>
          <h2>Columns (global defaults)</h2>
          <label>
            Default origin X
            <input v-model.number="p.originX" type="range" min="-300" max="300" step="1" />
            <span>{{ p.originX }}px</span>
          </label>
          <button type="button" class="btn btn-small" @click="applyGlobalOriginToAllRows">
            Apply origin X to all rows
          </button>
          <label>
            Auto col pitch
            <span>{{ autoColPitch.toFixed(1) }}px</span>
          </label>
          <label>
            Col min
            <input v-model.number="p.colMin" type="number" min="-6" max="6" />
          </label>
          <label>
            Col max
            <input
              :value="p.colMax ?? ''"
              type="number"
              placeholder="auto"
              @input="p.colMax = ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null"
            />
          </label>
        </section>

        <section>
          <div class="row-head">
            <h2>Rows</h2>
            <div class="row-actions">
              <button type="button" class="btn btn-small" @click="addRow">+ Row</button>
              <button type="button" class="btn btn-small btn-muted" @click="resetRowsFromHoneycomb">
                Honeycomb
              </button>
            </div>
          </div>

          <div class="row-tabs">
            <button
              v-for="(row, idx) in p.rows"
              :key="row.id"
              type="button"
              class="row-tab"
              :class="{ active: idx === selectedRowIdx, off: !row.enabled }"
              @click="selectedRowIdx = idx"
            >
              {{ row.id }}
            </button>
          </div>

          <div v-if="activeRow" class="row-panel">
            <label class="check">
              <input v-model="activeRow.enabled" type="checkbox" />
              Enabled
            </label>
            <label>
              Row id
              <input v-model.number="activeRow.id" type="number" step="1" />
            </label>
            <label>
              Y (center)
              <input v-model.number="activeRow.y" type="range" min="-120" max="580" step="1" />
              <input v-model.number="activeRow.y" type="number" min="-200" max="700" step="1" />
              <span>{{ activeRow.y }}px</span>
            </label>
            <label>
              Origin X
              <input v-model.number="activeRow.originX" type="range" min="-300" max="300" step="1" />
              <span>{{ activeRow.originX }}px</span>
            </label>
            <label>
              Offset X
              <input v-model.number="activeRow.offsetX" type="range" min="-300" max="300" step="1" />
              <span>{{ activeRow.offsetX }}px</span>
            </label>
            <label>
              Col pitch
              <input
                :value="activeRow.colPitch ?? ''"
                type="number"
                placeholder="global"
                @input="activeRow.colPitch = ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null"
              />
            </label>
            <label>
              Col min
              <input
                :value="activeRow.colMin ?? ''"
                type="number"
                placeholder="global"
                @input="activeRow.colMin = ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null"
              />
            </label>
            <label>
              Col max
              <input
                :value="activeRow.colMax ?? ''"
                type="number"
                placeholder="global"
                @input="activeRow.colMax = ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null"
              />
            </label>
            <button
              type="button"
              class="btn btn-small btn-danger"
              :disabled="p.rows.length <= 1"
              @click="removeRow(selectedRowIdx)"
            >
              Remove row
            </button>
          </div>
        </section>

        <section class="stats">
          <h2>Stats</h2>
          <dl>
            <dt>Cells</dt>
            <dd>{{ cells.length }}</dd>
            <dt>Visible</dt>
            <dd>{{ visibleCellCount }}</dd>
            <dt>Unique posters</dt>
            <dd :class="{ bad: uniquePosterCount < visibleCellCount }">
              {{ uniquePosterCount }} / {{ headerPosters.length }} pool
            </dd>
            <dt>Rows</dt>
            <dd>{{ p.rows.filter((r) => r.enabled).length }}</dd>
            <dt>Min gap</dt>
            <dd :class="{ bad: !validation.ok }">{{ validation.minGap.toFixed(1) }}px</dd>
            <dt>Valid</dt>
            <dd :class="{ bad: !validation.ok }">{{ validation.ok ? "yes" : "no" }}</dd>
          </dl>
        </section>

        <section class="actions">
          <button type="button" class="btn" :disabled="saving" @click="savePng">
            {{ saving ? "Saving…" : "Save PNG" }}
          </button>
          <button type="button" class="btn btn-muted" @click="copyConfig">
            {{ copied ? "Copied!" : "Copy config JSON" }}
          </button>
          <button type="button" class="btn btn-muted" @click="resetDefaults">Reset all</button>
          <p v-if="saveError" class="save-error">{{ saveError }}</p>
        </section>

        <pre class="export">{{ exportConfig }}</pre>
      </aside>

      <main class="preview-wrap">
        <div class="preview-toolbar">
          <button type="button" class="btn" :disabled="saving" @click="savePng">
            {{ saving ? "Saving…" : "Save PNG (1500×500)" }}
          </button>
          <span class="preview-hint">Exports exactly what you see below</span>
        </div>
        <div class="preview" v-html="previewSvg" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.lab {
  min-height: 100vh;
  min-height: 100dvh;
  overflow: auto;
  background: #0a0a0f;
  color: #fff;
  font-family: Mulish, ui-sans-serif, system-ui, sans-serif;
}

.lab-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #2e2f40;
}

.lab-header h1 {
  font-size: 1.125rem;
  font-weight: 700;
}

.lab-header p {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #a2a3aa;
}

.lab-body {
  display: grid;
  grid-template-columns: min(24rem, 100%) 1fr;
  gap: 0;
  min-height: calc(100vh - 4.5rem);
}

.controls {
  padding: 1rem 1.25rem 2rem;
  border-right: 1px solid #2e2f40;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

section h2 {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #ffc43b;
  margin-bottom: 0.625rem;
}

.row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.625rem;
}

.row-head h2 {
  margin-bottom: 0;
}

.row-actions {
  display: flex;
  gap: 0.35rem;
}

.row-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
}

.row-tab {
  background: #1c1d2f;
  border: 1px solid #2e2f40;
  color: #fff;
  border-radius: 6px;
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
  cursor: pointer;
}

.row-tab.active {
  border-color: #ffc43b;
  color: #ffc43b;
}

.row-tab.off {
  opacity: 0.45;
}

.row-panel {
  background: #14151f;
  border: 1px solid #2e2f40;
  border-radius: 8px;
  padding: 0.75rem;
}

label {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.35rem 0.75rem;
  align-items: center;
  font-size: 0.8125rem;
  margin-bottom: 0.5rem;
}

label input[type="range"] {
  grid-column: 1 / -1;
}

label input[type="number"] {
  grid-column: 1 / -1;
  background: #1c1d2f;
  border: 1px solid #2e2f40;
  color: #fff;
  border-radius: 6px;
  padding: 0.35rem 0.5rem;
}

label.check {
  grid-template-columns: auto 1fr;
}

.stats dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 0.75rem;
  font-size: 0.8125rem;
}

.stats dd.bad {
  color: #ff5c48;
}

.btn {
  background: #ffc43b;
  color: #1c1f33;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-weight: 700;
  font-size: 0.8125rem;
  cursor: pointer;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
}

.btn-small {
  padding: 0.3rem 0.55rem;
  font-size: 0.6875rem;
  margin-bottom: 0;
}

.btn-muted {
  background: #2e2f40;
  color: #fff;
}

.btn-danger {
  background: #ff5c48;
  color: #fff;
  margin-top: 0.5rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.save-error {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #ff5c48;
}

.export {
  font-size: 0.6875rem;
  background: #1c1d2f;
  border: 1px solid #2e2f40;
  border-radius: 8px;
  padding: 0.75rem;
  overflow: auto;
  max-height: 12rem;
  color: #a2a3aa;
  white-space: pre-wrap;
  word-break: break-all;
}

.preview-wrap {
  padding: 1.25rem;
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  background: #111118;
}

.preview-toolbar {
  width: min(100%, 1500px);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.preview-toolbar .btn {
  margin: 0;
}

.preview-hint {
  font-size: 0.75rem;
  color: #a2a3aa;
}

.preview {
  width: min(100%, 1500px);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.45);
}

.preview :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}

@media (max-width: 900px) {
  .lab-body {
    grid-template-columns: 1fr;
  }

  .controls {
    border-right: none;
    border-bottom: 1px solid #2e2f40;
  }
}
</style>
