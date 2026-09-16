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
  <ThankAllCueDialog
    v-else-if="thankAll"
    :title="thankAll.title"
    :busy="thankAllBusy"
    @cancel="$emit('cancel-thank-all')"
    @confirm="$emit('confirm-thank-all')"
  />
</template>

<script setup lang="ts">
import type { TitleSummary, WatchlistLeaveReason } from "@cinima/shared";
import type { ThankAllCue, TitleActionConfirmKind } from "@/composables/useTitleActionConfirm";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import ThankAllCueDialog from "@/components/ThankAllCueDialog.vue";
import WatchlistLeaveDialog from "@/components/WatchlistLeaveDialog.vue";

defineProps<{
  pending: { kind: TitleActionConfirmKind; title?: TitleSummary } | null;
  message: string;
  reason: WatchlistLeaveReason | null;
  thankAll?: ThankAllCue | null;
  thankAllBusy?: boolean;
}>();

defineEmits<{
  confirm: [];
  cancel: [];
  "update:reason": [reason: WatchlistLeaveReason | null];
  "confirm-thank-all": [];
  "cancel-thank-all": [];
}>();
</script>
