<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "./stores/auth";
import { demoEnabledOutsidePay, isNimiqPay } from "./lib/nimiqPay";
import NqSpinner from "./components/NqSpinner.vue";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const reveal = ref(false);

const isPublicRoute = () =>
  route.name === "landing" ||
  route.name === "gate" ||
  route.name === "public" ||
  route.name === "title-share" ||
  route.name === "short-share";

const shouldSoftBootLanding = () =>
  !!auth.token || demoEnabledOutsidePay() || isNimiqPay();

onMounted(async () => {
  // Public landing / share pages skip forced auth boot
  if (isPublicRoute()) {
    if (route.name === "landing" || route.name === "gate") {
      if (shouldSoftBootLanding()) {
        await auth.boot();
        if (auth.user) {
          await router.replace({ name: "discover" });
        }
      } else {
        auth.ready = true;
      }
    } else {
      auth.ready = true;
    }
    reveal.value = true;
    return;
  }
  await auth.boot();
  if (auth.error && !auth.user) {
    await router.replace({ name: "landing" });
  }
  reveal.value = true;
});
</script>

<template>
  <div v-if="!reveal && !isPublicRoute()" class="boot">
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
