<template>
  <div class="guestbook">
    <header class="guestbook-header">
      <button type="button" class="back-button" aria-label="Back" @click="goBack">
        <NqIcon name="arrow-left" :size="24" />
      </button>
    </header>
    <div v-if="loading" class="loading">
      <LoadingWait />
    </div>
    <div v-else class="content">
      <h1>{{ heading }}</h1>
      <GuestbookList v-if="items.length" :items="items" :show-heading="false" />
      <p v-else class="empty">No messages yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { RECEIVED_LIST_HEADING, type ReceivedItem } from "@cinima/shared";
import GuestbookList from "@/components/GuestbookList.vue";
import LoadingWait from "@/components/LoadingWait.vue";
import NqIcon from "@/components/NqIcon.vue";
import { useApi } from "@/composables/useApi";
import { creditsBackAction } from "@/lib/navBack";

const router = useRouter();
const { request } = useApi();
const loading = ref(true);
const items = ref<ReceivedItem[]>([]);
const heading = RECEIVED_LIST_HEADING;

function goBack() {
  if (creditsBackAction() === "history") router.back();
  else router.push({ name: "me" });
}

onMounted(async () => {
  try {
    const received = await request<{ items: ReceivedItem[] }>("/me/received");
    items.value = received.items;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.guestbook {
  min-height: 100%;
  padding-bottom: 2rem;
}

.guestbook-header {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem 0;
}

.back-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-primary);
}

.content {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.content h1 {
  margin: 0;
  padding: 0 1rem;
  font-size: 1.35rem;
}

.loading,
.empty {
  padding: 2rem 1rem;
  color: var(--text-secondary);
}

.content :deep(.received) {
  padding-top: 0;
}
</style>
