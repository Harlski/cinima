<template>
  <div class="confirm-modal" role="presentation" @click.self="$emit('cancel')">
    <div
      class="confirm-dialog nq-card"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="labelledBy"
      @click="onDialogClick"
    >
      <div v-if="title" class="leave-card">
        <div class="leave-poster">
          <PosterImg
            v-if="title.posterUrl"
            :src="title.posterUrl"
            :alt="title.title"
            :spinner-size="28"
          />
          <div v-else class="leave-poster-fallback">{{ title.title }}</div>
        </div>
        <p :id="nameId" class="leave-name">{{ title.title }}</p>
        <p class="leave-meta">
          <span v-if="title.year">{{ title.year }}</span>
          <span v-if="title.year" class="dot">·</span>
          <span>{{ mediaLabel }}</span>
          <span class="dot">·</span>
          <span class="rating" :class="{ muted: title.rating == null }">
            {{ formatTitleRating(title.rating) }}
          </span>
        </p>
      </div>

      <h2 :id="headingId">{{ message }}</h2>

      <div class="reason" @keydown.escape.stop="reasonOpen = false">
        <span :id="reasonLabelId">Why?</span>
        <div class="reason-field">
          <button
            :id="triggerId"
            type="button"
            class="nq-input-box reason-trigger"
            aria-haspopup="listbox"
            :aria-expanded="reasonOpen"
            :aria-controls="listId"
            :aria-activedescendant="reasonOpen ? optionId(highlightIndex) : undefined"
            :aria-labelledby="`${reasonLabelId} ${triggerId}`"
            @click.stop="toggleReasonList"
            @keydown="onTriggerKeydown"
          >
            <span>{{ reasonLabel }}</span>
            <span class="reason-chevron" :class="{ open: reasonOpen }" aria-hidden="true" />
          </button>
          <ul
            v-if="reasonOpen"
            :id="listId"
            class="reason-list"
            role="listbox"
            :aria-labelledby="reasonLabelId"
          >
            <li
              v-for="(value, index) in reasonChoices"
              :id="optionId(index)"
              :key="value ?? 'skip'"
              class="reason-option"
              :class="{ 'is-active': highlightIndex === index }"
              role="option"
              :aria-selected="reason === value"
              @click.stop="selectReason(value)"
            >
              {{
                value == null
                  ? WATCHLIST_LEAVE_REASON_PLACEHOLDER
                  : WATCHLIST_LEAVE_REASON_LABELS[value]
              }}
            </li>
          </ul>
        </div>
      </div>

      <div class="confirm-actions">
        <button type="button" class="nq-pill-secondary nq-pill-lg" @click="$emit('cancel')">
          No
        </button>
        <button type="button" class="nq-pill-blue nq-pill-lg" @click="$emit('confirm')">
          Remove
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from "vue";
import {
  WATCHLIST_LEAVE_REASON_LABELS,
  WATCHLIST_LEAVE_REASON_PLACEHOLDER,
  WATCHLIST_LEAVE_REASONS,
  type TitleSummary,
  type WatchlistLeaveReason,
} from "@cinima/shared";
import PosterImg from "@/components/PosterImg.vue";
import { formatTitleRating } from "@/lib/titleRating";

const props = defineProps<{
  message: string;
  reason: WatchlistLeaveReason | null;
  title?: TitleSummary | null;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
  "update:reason": [reason: WatchlistLeaveReason | null];
}>();

const headingId = useId();
const nameId = useId();
const reasonLabelId = useId();
const triggerId = useId();
const listId = useId();
const optionBaseId = useId();
const reasonOpen = ref(false);
const highlightIndex = ref(0);
const reasonChoices: (WatchlistLeaveReason | null)[] = [
  null,
  ...WATCHLIST_LEAVE_REASONS,
];

const labelledBy = computed(() =>
  props.title ? `${nameId} ${headingId}` : headingId
);

const mediaLabel = computed(() => {
  const kind = props.title?.mediaType || props.title?.kind;
  return kind === "tv" ? "TV" : "Movie";
});

const reasonLabel = computed(() =>
  props.reason == null
    ? WATCHLIST_LEAVE_REASON_PLACEHOLDER
    : WATCHLIST_LEAVE_REASON_LABELS[props.reason]
);

function optionId(index: number) {
  return `${optionBaseId}-${index}`;
}

function currentReasonIndex() {
  const index = reasonChoices.findIndex((value) => value === props.reason);
  return index < 0 ? 0 : index;
}

function openReasonList() {
  highlightIndex.value = currentReasonIndex();
  reasonOpen.value = true;
}

function toggleReasonList() {
  if (reasonOpen.value) {
    reasonOpen.value = false;
    return;
  }
  openReasonList();
}

function selectReason(value: WatchlistLeaveReason | null) {
  emit("update:reason", value);
  reasonOpen.value = false;
}

function onDialogClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (target?.closest(".reason")) return;
  reasonOpen.value = false;
}

function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && reasonOpen.value) {
    event.stopPropagation();
    reasonOpen.value = false;
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (!reasonOpen.value) {
      openReasonList();
      return;
    }
    highlightIndex.value = Math.min(
      highlightIndex.value + 1,
      reasonChoices.length - 1
    );
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (!reasonOpen.value) {
      openReasonList();
      return;
    }
    highlightIndex.value = Math.max(highlightIndex.value - 1, 0);
    return;
  }
  if ((event.key === "Enter" || event.key === " ") && reasonOpen.value) {
    event.preventDefault();
    selectReason(reasonChoices[highlightIndex.value] ?? null);
  }
}
</script>

<style scoped>
.confirm-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
  background: color-mix(in oklch, var(--colors-neutral) 28%, transparent);
}

.confirm-dialog {
  width: min(100%, 22rem);
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.35rem 1.25rem 1.25rem;
  text-align: center;
}

.leave-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.leave-poster {
  width: min(32vw, 6.75rem);
  aspect-ratio: 2 / 3;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-surface);
  flex-shrink: 0;
  box-shadow: 0 12px 28px color-mix(in oklch, var(--colors-neutral) 28%, transparent);
}

.leave-poster :deep(.poster-img),
.leave-poster :deep(img) {
  width: 100%;
  height: 100%;
  display: block;
}

.leave-poster-fallback {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 0.5rem;
  text-align: center;
  color: var(--text-secondary);
  font-weight: 700;
  font-size: 0.82rem;
}

.leave-name {
  margin: 0;
  max-width: 100%;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leave-meta {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.leave-meta .dot {
  opacity: 0.55;
}

.leave-meta .rating {
  color: var(--warning);
  font-weight: 600;
}

.leave-meta .rating.muted {
  color: var(--text-secondary);
  font-weight: 500;
}

.confirm-dialog h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--text-primary);
}

.reason {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  text-align: left;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.reason-field {
  position: relative;
}

.reason-trigger {
  appearance: none;
  -webkit-appearance: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  min-height: 2.55rem;
  padding: 0.55rem 0.75rem;
  border: 1.5px solid var(--border);
  border-radius: 0.5rem;
  background: var(--bg-primary);
  text-align: left;
  font: inherit;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
}

.reason-trigger:focus,
.reason-trigger:focus-visible {
  outline: 1.5px solid var(--outline-color, var(--primary));
}

.reason-chevron {
  width: 0.45rem;
  height: 0.45rem;
  flex-shrink: 0;
  border-right: 2px solid var(--text-secondary);
  border-bottom: 2px solid var(--text-secondary);
  transform: rotate(45deg) translateY(-0.12rem);
  transition: transform 0.15s ease;
}

.reason-chevron.open {
  transform: rotate(225deg) translateY(-0.12rem);
}

.reason-list {
  position: absolute;
  z-index: 3;
  top: 0;
  left: 0;
  right: 0;
  list-style: none;
  margin: 0;
  padding: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  border-radius: 0.5rem;
  border: 1.5px solid var(--border);
  background: var(--bg-primary);
  box-shadow: 0 12px 28px color-mix(in oklch, var(--colors-neutral) 28%, transparent);
}

.reason-option {
  display: block;
  width: 100%;
  border-radius: 0.35rem;
  color: var(--text-primary);
  font-weight: 600;
  text-align: left;
  padding: 0.55rem 0.65rem;
  cursor: pointer;
}

.reason-option[aria-selected="true"] {
  background: color-mix(in oklch, var(--colors-blue) 18%, transparent);
}

.reason-option.is-active,
.reason-option:hover {
  background: color-mix(in oklch, var(--colors-neutral) 10%, transparent);
}

.reason-option[aria-selected="true"].is-active,
.reason-option[aria-selected="true"]:hover {
  background: color-mix(in oklch, var(--colors-blue) 26%, transparent);
}

.confirm-actions {
  display: flex;
  gap: 0.65rem;
  justify-content: center;
}

.confirm-actions .nq-pill-lg {
  flex: 1;
  max-width: 8rem;
}
</style>
