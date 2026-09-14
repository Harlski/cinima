<template>
  <div v-if="isDev" class="proto-switcher" role="group" :aria-label="ariaLabel">
    <button
      type="button"
      class="proto-switcher-btn"
      aria-label="Previous variant"
      @click="cycle(-1)"
    >
      ←
    </button>
    <p class="proto-switcher-label">
      <span class="proto-switcher-key">{{ current }}</span>
      <span v-if="currentName">{{ currentName }}</span>
    </p>
    <button
      type="button"
      class="proto-switcher-btn"
      aria-label="Next variant"
      @click="cycle(1)"
    >
      →
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";

export type PrototypeVariant = {
  key: string;
  name: string;
};

const props = withDefaults(
  defineProps<{
    variants: PrototypeVariant[];
    param?: string;
    ariaLabel?: string;
  }>(),
  {
    param: "variant",
    ariaLabel: "Prototype variants",
  }
);

const isDev = import.meta.env.DEV;
const route = useRoute();
const router = useRouter();

const keys = computed(() => props.variants.map((v) => v.key));

const current = computed(() => {
  const raw = String(route.query[props.param] ?? "");
  if (keys.value.includes(raw)) return raw;
  return keys.value[0] ?? "";
});

const currentName = computed(
  () => props.variants.find((v) => v.key === current.value)?.name ?? ""
);

function cycle(delta: number) {
  const list = keys.value;
  if (!list.length) return;
  const i = Math.max(0, list.indexOf(current.value));
  const next = list[(i + delta + list.length) % list.length];
  void router.replace({
    query: { ...route.query, [props.param]: next },
  });
}

function onKeydown(e: KeyboardEvent) {
  const target = e.target;
  if (target instanceof HTMLElement) {
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    cycle(1);
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    cycle(-1);
  }
}

onMounted(() => {
  if (!isDev) return;
  window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<style scoped>
.proto-switcher {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(var(--bottom-tabs-inset, 0px) + 4.1rem);
  z-index: 70;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: min(calc(100% - 1.5rem), 22.5rem);
  padding: 0.35rem 0.4rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: color-mix(in oklch, var(--colors-neutral) 88%, transparent);
  box-shadow: 0 8px 28px color-mix(in oklch, var(--colors-neutral) 45%, transparent);
  color: var(--colors-neutral-0);
}

.proto-switcher-btn {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 2.15rem;
  height: 2.15rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: color-mix(in oklch, var(--colors-neutral-0) 16%, transparent);
  color: inherit;
  font: inherit;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}

.proto-switcher-label {
  margin: 0;
  flex: 1;
  min-width: 0;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proto-switcher-key {
  display: block;
  font-size: 0.65rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  color: color-mix(in oklch, var(--colors-neutral-0) 72%, transparent);
}
</style>
