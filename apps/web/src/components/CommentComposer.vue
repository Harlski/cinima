<template>
  <div class="comment-composer">
    <button
      type="button"
      class="nq-pill-secondary nq-pill-lg nq-pill-stretch"
      @click="openSheet"
    >
      Leave a comment
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        class="comment-modal"
        data-scroll-trap
        role="presentation"
        @click.self="dismiss"
      >
        <form
          class="comment-dialog nq-card"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          @submit.prevent="onSubmit"
        >
          <h2 :id="titleId">Comment</h2>
          <p class="comment-on">{{ titleName }}</p>
          <textarea
            ref="fieldEl"
            :value="text"
            class="nq-input-box"
            placeholder="Share your thoughts..."
            rows="5"
            :maxlength="COMMENT_MAX_LENGTH"
            :disabled="posting"
            @input="onInput"
          />
          <p class="comment-count">{{ text.length }}/{{ COMMENT_MAX_LENGTH }}</p>
          <div class="comment-actions">
            <button
              type="button"
              class="nq-pill-secondary nq-pill-lg"
              :disabled="!canDismissCommentSheet(posting)"
              @click="dismiss"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="nq-pill-blue nq-pill-lg"
              :disabled="!canPostComment(text, posting)"
              :aria-busy="posting"
            >
              {{ acceptedWaitLabel("Post", posting) }}
            </button>
          </div>
        </form>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, ref, useId, watch } from "vue";
import { COMMENT_MAX_LENGTH } from "@cinima/shared";
import { acceptedWaitLabel } from "@/lib/acceptedWait";
import {
  canDismissCommentSheet,
  canPostComment,
  shouldCloseCommentSheet,
} from "@/lib/commentComposer";

const props = defineProps<{
  text: string;
  posting: boolean;
  titleName: string;
}>();

const emit = defineEmits<{
  "update:text": [value: string];
  "update:open": [open: boolean];
  submit: [];
}>();

const titleId = useId();
const open = ref(false);
const fieldEl = ref<HTMLTextAreaElement | null>(null);

watch(open, async (isOpen) => {
  emit("update:open", isOpen);
  if (!isOpen) {
    window.removeEventListener("keydown", onKeydown);
    return;
  }
  window.addEventListener("keydown", onKeydown);
  await nextTick();
  fieldEl.value?.focus();
});

watch(
  () => props.posting,
  (busy, wasBusy) => {
    if (
      shouldCloseCommentSheet({
        wasPosting: Boolean(wasBusy),
        posting: busy,
        body: props.text,
      })
    ) {
      open.value = false;
    }
  }
);

function openSheet() {
  open.value = true;
}

function dismiss() {
  if (!canDismissCommentSheet(props.posting)) return;
  open.value = false;
}

function onInput(e: Event) {
  emit("update:text", (e.target as HTMLTextAreaElement).value);
}

function onSubmit() {
  if (!canPostComment(props.text, props.posting)) return;
  emit("submit");
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  e.preventDefault();
  dismiss();
}

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<style scoped>
.comment-composer {
  margin-top: 0.75rem;
}

.comment-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: end center;
  padding: 1.25rem;
  padding-bottom: calc(var(--bottom-tabs-inset, 5.5rem) + 0.75rem);
  background: transparent;
}

.comment-dialog {
  width: min(100%, 22rem);
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding: 1.2rem 1.15rem 1.1rem;
}

.comment-dialog h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.35;
}

.comment-on {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.comment-dialog textarea {
  width: 100%;
  resize: none;
  border-radius: 0.75rem;
  background-color: var(--colors-white);
  --color: var(--colors-darkblue);
  --placeholder-color: color-mix(in oklch, var(--colors-darkblue) 45%, transparent);
  --outline-color: color-mix(in oklch, var(--colors-darkblue) 16%, transparent);
}

.comment-dialog textarea::placeholder {
  opacity: 1;
}

.comment-count {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-align: right;
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.comment-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
