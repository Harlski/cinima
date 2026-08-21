<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "./stores/auth";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

onMounted(async () => {
  // Public profiles skip auth boot
  if (route.name === "public") {
    auth.ready = true;
    return;
  }
  await auth.boot();
  if (auth.error && !auth.user) {
    router.replace({ name: "gate" });
  }
});
</script>

<template>
  <div v-if="!auth.ready && route.name !== 'public'" class="boot">Starting Cinima…</div>
  <div v-else-if="auth.error && !auth.user && route.name !== 'public'" class="boot">
    <p>{{ auth.error }}</p>
    <button type="button" @click="auth.boot()">Retry</button>
    <p style="opacity: 0.7; margin-top: 1rem">
      In Nimiq Pay: approve account share + sign prompts.<br />
      Desktop only: open with <code>?demo=1</code>
    </p>
  </div>
  <RouterView v-else />
</template>

<style scoped>
.boot {
  min-height: 100dvh;
  display: grid;
  place-content: center;
  gap: 0.75rem;
  text-align: center;
  padding: 2rem;
  background: var(--bg-primary, #0a0a0f);
  color: var(--text-primary, #f5f5f7);
  font-family: var(--font, Mulish, system-ui, sans-serif);
}
button {
  justify-self: center;
  padding: 0.7rem 1.2rem;
  border: 0;
  border-radius: 10px;
  background: #e74c3c;
  color: white;
  font-weight: 600;
}
</style>
