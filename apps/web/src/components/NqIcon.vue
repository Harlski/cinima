<template>
  <svg
    class="nq-icon"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    aria-hidden="true"
    :viewBox="`0 0 ${meta.width} ${meta.height}`"
    :width="size"
    :height="size"
    v-html="meta.body"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { nqIconMeta, type NqIconName } from "@/lib/nqIcon";

const props = withDefaults(
  defineProps<{
    name: NqIconName;
    size?: number;
  }>(),
  {
    size: 24,
  }
);

const meta = computed(() => nqIconMeta(props.name));
</script>
