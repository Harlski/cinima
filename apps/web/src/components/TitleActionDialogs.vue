<template>
  <WatchlistLeaveDialog
    v-if="pending?.kind === 'watchlist'"
    :message="message"
    :title="pending.title"
    :reason="reason"
    @update:reason="$emit('update:reason', $event)"
    @cancel="$emit('cancel')"
    @confirm="$emit('confirm')"
  />
  <ConfirmDialog
    v-else-if="pending"
    :message="message"
    @cancel="$emit('cancel')"
    @confirm="$emit('confirm')"
  />
</template>

<script setup lang="ts">
import type { TitleSummary, WatchlistLeaveReason } from "@cinima/shared";
import type { TitleActionConfirmKind } from "@/composables/useTitleActionConfirm";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import WatchlistLeaveDialog from "@/components/WatchlistLeaveDialog.vue";

defineProps<{
  pending: { kind: TitleActionConfirmKind; title?: TitleSummary } | null;
  message: string;
  reason: WatchlistLeaveReason | null;
}>();

defineEmits<{
  cancel: [];
  confirm: [];
  "update:reason": [reason: WatchlistLeaveReason | null];
}>();
</script>
