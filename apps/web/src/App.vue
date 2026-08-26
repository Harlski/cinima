<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "./stores/auth";
import { useTouchScrollGuard } from "./composables/useTouchScrollGuard";
import { isLandingFrontDoor } from "./lib/landingGate";
import { stashPostAuthPath } from "./lib/postAuthPath";
import NqSpinner from "./components/NqSpinner.vue";

useTouchScrollGuard();

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const reveal = ref(false);

const isShareRoute = () =>
  route.name === "public" ||
  route.name === "title-share" ||
  route.name === "short-share";

const isPublicLabRoute = () => route.name === "pay-deep-link-lab";

onMounted(async () => {
  // Wait until the initial URL is resolved. Otherwise route.name is still
  // undefined (START_LOCATION) and we would wrongly auth.boot() on `/`.
  await router.isReady();

  if (isShareRoute() || isPublicLabRoute()) {
    auth.ready = true;
    reveal.value = true;
    return;
  }

  // Landing / gate: public front door. Never auto-boot wallet auth here.
  // Inside Pay, user taps "Enter CINIMA" to move into the app, then signing runs.
  if (isLandingFrontDoor(route)) {
    auth.ready = true;
    reveal.value = true;
    return;
  }

  await auth.boot();
  if (auth.error && !auth.user) {
    stashPostAuthPath(route.fullPath);
    await router.replace({ name: "landing" });
  }
  reveal.value = true;
});
</script>

<template>
  <div
    v-if="!reveal && !isShareRoute()"
    class="boot"
  >
    <div class="boot-stack">
      <NqSpinner label="Starting Cinima" />
      <div aria-hidden="true">Starting Cinima…</div>
    </div>
  </div>
  <RouterView v-else />
</template>

<style scoped>
.boot {
  position: relative;
  z-index: 1;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--text-primary);
  font-family: var(--font);
}

.boot-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
}
</style>
