<template>
  <div class="expandable">
    <p
      ref="textEl"
      class="expandable-text"
      :class="{ 'is-clamped': !expanded }"
      :style="clampStyle"
    >
      {{ text }}
    </p>
    <button
      v-if="overflows"
      type="button"
      class="expandable-toggle"
      @click.stop="onToggle"
    >
      {{ expanded ? "Show less" : "Read more" }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    text: string;
    lines?: number;
    /** Start expanded (e.g. deep-linked from a deck Read more). */
    initialExpanded?: boolean;
    /**
     * When true, the first "Read more" click emits `read-more` instead of
     * expanding locally (use to open the title page).
     */
    emitReadMore?: boolean;
  }>(),
  {
    lines: 3,
    initialExpanded: false,
    emitReadMore: false,
  }
);

const emit = defineEmits<{
  "read-more": [];
}>();

const textEl = ref<HTMLElement | null>(null);
const expanded = ref(props.initialExpanded);
const overflows = ref(false);
let observer: ResizeObserver | null = null;

const clampStyle = computed(() =>
  expanded.value
    ? undefined
    : {
        webkitLineClamp: props.lines,
        lineClamp: props.lines,
      }
);

const measure = () => {
  const el = textEl.value;
  if (!el) return;
  if (expanded.value) return;
  overflows.value = el.scrollHeight > el.clientHeight + 1;
};

function onToggle() {
  if (props.emitReadMore && !expanded.value) {
    emit("read-more");
    return;
  }
  expanded.value = !expanded.value;
}

watch(
  () => props.text,
  () => {
    expanded.value = props.initialExpanded;
    requestAnimationFrame(measure);
  }
);

watch(
  () => props.initialExpanded,
  (value) => {
    if (value) expanded.value = true;
  }
);

onMounted(() => {
  measure();
  observer = new ResizeObserver(measure);
  if (textEl.value) observer.observe(textEl.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<style scoped>
.expandable {
  min-width: 0;
}

.expandable-text {
  margin: 0;
  line-height: 1.5;
  color: var(--text-primary);
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: pre-wrap;
}

.expandable-text.is-clamped {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.expandable-toggle {
  margin-top: 0.2rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--primary);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.expandable-toggle:hover {
  text-decoration: underline;
}
</style>
