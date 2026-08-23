<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "./stores/auth";
import NqSpinner from "./components/NqSpinner.vue";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const reveal = ref(false);

onMounted(async () => {
  // Public profiles skip auth boot
  if (route.name === "public" || route.name === "title-share" || route.name === "short-share") {
    auth.ready = true;
    reveal.value = true;
    return;
  }
  await auth.boot();
  if (auth.error && !auth.user && route.name !== "gate") {
    await router.replace({ name: "gate" });
  }
  reveal.value = true;
});
</script>

<template>
  <div v-if="!reveal && route.name !== 'public' && route.name !== 'title-share' && route.name !== 'short-share'" class="boot">
    <NqSpinner label="Starting Cinima" />
    <div aria-hidden="true">Starting Cinima…</div>
  </div>
  <RouterView v-else />
</template>

<style scoped>
.boot {
  position: relative;
  z-index: 1;
  min-height: 100dvh;
  display: grid;
  place-content: center;
  gap: 0.75rem;
  text-align: center;
  padding: 2rem;
  color: var(--text-primary);
  font-family: var(--font);
}
</style>
