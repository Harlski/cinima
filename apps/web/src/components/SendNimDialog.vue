<template>
  <Teleport to="body">
    <div
      v-if="pending"
      class="send-nim-modal"
      role="presentation"
      @click.self="onCancel"
    >
      <div
        class="send-nim-dialog nq-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-nim-title"
        @click="onDialogClick"
      >
        <div class="send-nim-heading">
          <h2 id="send-nim-title">{{ userSendCta }}</h2>
          <span class="send-nim-info-wrap">
            <button
              type="button"
              class="send-nim-info"
              aria-label="About this message"
              :aria-describedby="infoId"
            >
              <NqIcon name="info" :size="16" />
            </button>
            <span :id="infoId" class="send-nim-tip" role="tooltip">
              {{ infoCopy }}
            </span>
          </span>
        </div>
        <p class="send-nim-copy">Optional. Thanks already landed.</p>
        <div class="send-nim-note" @keydown.escape.stop="noteOpen = false">
          <span :id="noteLabelId">Message</span>
          <div class="send-nim-note-field">
            <button
              :id="noteTriggerId"
              type="button"
              class="nq-input-box send-nim-note-trigger"
              aria-haspopup="listbox"
              :aria-expanded="noteOpen"
              :aria-controls="noteListId"
              :aria-labelledby="`${noteLabelId} ${noteTriggerId}`"
              :disabled="busy"
              @click.stop="toggleNoteList"
              @keydown="onNoteKeydown"
            >
              <span>{{ selectedLabel }}</span>
              <span class="send-nim-cost">{{ costLabel }}</span>
              <span class="send-nim-chevron" :class="{ open: noteOpen }" aria-hidden="true" />
            </button>
            <ul
              v-if="noteOpen"
              :id="noteListId"
              class="send-nim-note-list"
              role="listbox"
              :aria-labelledby="noteLabelId"
            >
              <li
                v-for="(note, index) in notes"
                :id="optionId(index)"
                :key="note.id"
                class="send-nim-note-option"
                :class="{ 'is-active': highlightIndex === index }"
                role="option"
                :aria-selected="noteId === note.id"
                @click.stop="chooseNote(note.id)"
              >
                <span>{{ note.label }}</span>
                <span class="send-nim-cost">{{ userSendNoteCostLabel(note.id) }}</span>
              </li>
            </ul>
          </div>
        </div>
        <p
          v-if="error"
          :class="error === cancelledCopy ? 'send-nim-status' : 'send-nim-error'"
        >
          {{ error }}
        </p>
        <div class="send-nim-actions">
          <button
            type="button"
            class="nq-pill-secondary nq-pill-lg"
            :disabled="busy"
            @click="onCancel"
          >
            Not now
          </button>
          <button
            type="button"
            class="nq-pill-blue nq-pill-lg"
            :disabled="busy"
            :aria-busy="busy"
            @click="onSend"
          >
            {{ acceptedWaitLabel("Send", busy) }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import { storeToRefs } from "pinia";
import {
  USER_SEND_CTA,
  USER_SEND_NOTES,
  userSendNoteCostLabel,
  userSendNoteLabel,
  type UserSendNoteId,
} from "@cinima/shared";
import NqIcon from "@/components/NqIcon.vue";
import { acceptedWaitLabel } from "@/lib/acceptedWait";
import { PAY_CANCELLED_MESSAGE } from "@/lib/nimiqPay";
import { useUserSendStore } from "@/stores/userSend";

const store = useUserSendStore();
const { pending, busy, error, noteId } = storeToRefs(store);

const userSendCta = USER_SEND_CTA;
const cancelledCopy = PAY_CANCELLED_MESSAGE;
const notes = USER_SEND_NOTES;
const costLabel = computed(() => userSendNoteCostLabel(noteId.value));
const infoCopy =
  "If this Handle has notifications enabled, they may see this message.";

const noteOpen = ref(false);
const highlightIndex = ref(0);
const infoId = useId();
const noteLabelId = useId();
const noteTriggerId = useId();
const noteListId = useId();
const optionBaseId = useId();

const selectedLabel = computed(() => userSendNoteLabel(noteId.value));

watch(pending, () => {
  noteOpen.value = false;
});

function optionId(index: number) {
  return `${optionBaseId}-${index}`;
}

function currentNoteIndex() {
  const index = notes.findIndex((note) => note.id === noteId.value);
  return index < 0 ? 0 : index;
}

function openNoteList() {
  highlightIndex.value = currentNoteIndex();
  noteOpen.value = true;
}

function toggleNoteList() {
  if (busy.value) return;
  if (noteOpen.value) {
    noteOpen.value = false;
    return;
  }
  openNoteList();
}

async function chooseNote(id: UserSendNoteId) {
  if (busy.value) return;
  store.selectNote(id);
  noteOpen.value = false;
  await store.confirm();
}

function onDialogClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target?.closest(".send-nim-note")) noteOpen.value = false;
}

function onNoteKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && noteOpen.value) {
    event.stopPropagation();
    noteOpen.value = false;
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (!noteOpen.value) {
      openNoteList();
      return;
    }
    highlightIndex.value = Math.min(highlightIndex.value + 1, notes.length - 1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (!noteOpen.value) {
      openNoteList();
      return;
    }
    highlightIndex.value = Math.max(highlightIndex.value - 1, 0);
    return;
  }
  if ((event.key === "Enter" || event.key === " ") && noteOpen.value) {
    event.preventDefault();
    const note = notes[highlightIndex.value];
    if (note) void chooseNote(note.id);
  }
}

function onCancel() {
  store.cancel();
}

async function onSend() {
  noteOpen.value = false;
  await store.confirm();
}
</script>

<style scoped>
.send-nim-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
  background: color-mix(in oklch, var(--colors-neutral) 28%, transparent);
}

.send-nim-dialog {
  width: min(100%, 22rem);
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1.35rem 1.25rem 1.25rem;
  text-align: center;
}

.send-nim-heading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.send-nim-dialog h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.35;
}

.send-nim-info-wrap {
  position: relative;
  display: grid;
  place-items: center;
}

.send-nim-info {
  display: grid;
  place-items: center;
  width: 1.6rem;
  height: 1.6rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.send-nim-info:hover,
.send-nim-info:focus-visible {
  color: var(--text-primary);
}

.send-nim-tip {
  position: absolute;
  top: calc(100% + 0.4rem);
  left: 50%;
  z-index: 4;
  width: min(16.5rem, calc(100vw - 3rem));
  transform: translateX(-50%);
  padding: 0.5rem 0.65rem;
  border-radius: 0.55rem;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.35;
  text-align: left;
  box-shadow: 0 10px 24px color-mix(in oklch, var(--colors-neutral) 28%, transparent);
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
}

.send-nim-info-wrap:hover .send-nim-tip,
.send-nim-info-wrap:focus-within .send-nim-tip {
  opacity: 1;
  visibility: visible;
}

.send-nim-copy,
.send-nim-error,
.send-nim-status {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
  color: var(--text-secondary);
}

.send-nim-error {
  color: var(--danger, #c0392b);
}

.send-nim-note {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  text-align: left;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.send-nim-note-field {
  position: relative;
}

.send-nim-note-trigger {
  appearance: none;
  -webkit-appearance: none;
  display: flex;
  align-items: center;
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

.send-nim-note-trigger > span:first-child {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.send-nim-note-trigger:disabled {
  cursor: default;
  opacity: 0.7;
}

.send-nim-chevron {
  width: 0.45rem;
  height: 0.45rem;
  flex-shrink: 0;
  border-right: 2px solid var(--text-secondary);
  border-bottom: 2px solid var(--text-secondary);
  transform: rotate(45deg) translateY(-0.12rem);
  transition: transform 0.15s ease;
}

.send-nim-chevron.open {
  transform: rotate(225deg) translateY(-0.12rem);
}

.send-nim-note-list {
  position: absolute;
  z-index: 5;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  list-style: none;
  margin: 0;
  padding: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  max-height: min(16rem, 45vh);
  overflow-y: auto;
  border-radius: 0.5rem;
  border: 1.5px solid var(--border);
  background: var(--bg-primary);
  box-shadow: 0 12px 28px color-mix(in oklch, var(--colors-neutral) 28%, transparent);
}

.send-nim-note-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  width: 100%;
  border-radius: 0.35rem;
  color: var(--text-primary);
  font-weight: 600;
  text-align: left;
  padding: 0.55rem 0.65rem;
  cursor: pointer;
}

.send-nim-cost {
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--gold, #e5c158);
  white-space: nowrap;
}

.send-nim-note-option[aria-selected="true"] {
  background: color-mix(in oklch, var(--colors-blue) 18%, transparent);
}

.send-nim-note-option.is-active,
.send-nim-note-option:hover {
  background: color-mix(in oklch, var(--colors-neutral) 10%, transparent);
}

.send-nim-actions {
  display: flex;
  gap: 0.65rem;
  justify-content: center;
}

.send-nim-actions .nq-pill-lg {
  flex: 1;
  max-width: 9rem;
}
</style>
