<template>
  <img
    v-if="src"
    class="identicon"
    :class="{ 'identicon--plain': plain }"
    :src="src"
    :alt="alt"
    :width="size"
    :height="size"
    decoding="async"
  />
  <span
    v-else
    class="identicon identicon--fallback"
    :class="{ 'identicon--plain': plain }"
    :style="fallbackStyle"
  >{{ fallback }}</span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { identiconDataUrl } from "@/lib/identicon";

const props = withDefaults(
  defineProps<{
    address?: string | null;
    size?: number;
    alt?: string;
    /** Character on the hexagon plate: no circular CSS clip or fill. */
    plain?: boolean;
  }>(),
  {
    address: "",
    size: 40,
    alt: "Identicon",
    plain: false,
  }
);

const src = ref("");

const fallback = computed(() => {
  const w = props.address || "";
  return w.replace(/\s+/g, "").slice(0, 2).toUpperCase() || "?";
});

const fallbackStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.max(10, Math.round(props.size * 0.35))}px`,
}));

watch(
  () => props.address,
  async (addr) => {
    src.value = "";
    if (!addr) return;
    try {
      src.value = await identiconDataUrl(addr);
    } catch {
      src.value = "";
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.identicon {
  display: block;
  border-radius: 50%;
  object-fit: cover;
  background: var(--bg-primary);
  flex-shrink: 0;
}

.identicon--plain {
  border-radius: 0;
  background: transparent;
}

.identicon--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
}
</style>
