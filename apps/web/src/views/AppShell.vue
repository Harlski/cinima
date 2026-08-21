<template>
  <div class="app-shell">
    <AppBrandHeader fixed />

    <div class="app-content">
      <div class="app-column">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <KeepAlive include="Discover">
              <component :is="Component" />
            </KeepAlive>
          </Transition>
        </RouterView>
      </div>
    </div>
    <nav class="bottom-tabs">
      <RouterLink to="/discover" class="tab">
        <NqIcon name="cinema-tickets" :size="24" />
        <span>Discover</span>
      </RouterLink>
      <RouterLink to="/search" class="tab">
        <NqIcon name="magnifying-glass" :size="24" />
        <span>Search</span>
      </RouterLink>
      <RouterLink to="/activity" class="tab">
        <NqIcon name="bell" :size="24" />
        <span>Activity</span>
      </RouterLink>
      <RouterLink to="/me" class="tab tab--me">
        <Identicon
          class="tab-identicon"
          :address="walletAddress"
          :size="26"
          alt="Me"
        />
        <span>Me</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { RouterView, RouterLink } from "vue-router";
import { useViewportChromeLock } from "@/composables/useViewportChromeLock";
import { useFavoritesStore } from "@/stores/favorites";
import { useAuthStore } from "@/stores/auth";
import AppBrandHeader from "@/components/AppBrandHeader.vue";
import Identicon from "@/components/Identicon.vue";
import NqIcon from "@/components/NqIcon.vue";

useViewportChromeLock();

const favoritesStore = useFavoritesStore();
const authStore = useAuthStore();
const walletAddress = computed(() => authStore.user?.walletAddress || "");

onMounted(() => {
  favoritesStore.load();
});
</script>

<style scoped>
.app-shell {
  /* Keep in sync with .bottom-tabs padding + tab row (icon + label + tab padding) */
  --bottom-tabs-pad-top: 0.5rem;
  --bottom-tabs-pad-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
  /* 26px matches Me identicon (svg tabs are 24px) */
  --bottom-tabs-inner: calc(0.5rem + 26px + 0.25rem + 1.125rem + 0.5rem);
  --bottom-tabs-height: calc(
    var(--bottom-tabs-pad-top) + var(--bottom-tabs-inner) + var(--bottom-tabs-pad-bottom)
  );
  --bottom-tabs-inset: calc(
    var(--bottom-tabs-height) + var(--vv-bottom-inset, 0px)
  );
  --app-brand-row: 2.75rem;
  position: relative;
  z-index: 1;
  height: 100dvh;
  overflow: hidden;
  overscroll-behavior: none;
}

.app-content {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: none;
  touch-action: pan-y;
  overflow-anchor: none;
  -webkit-overflow-scrolling: touch;
  isolation: isolate;
  padding-top: var(--app-brand-row);
  padding-bottom: var(--bottom-tabs-inset);
}

.bottom-tabs {
  position: fixed;
  left: 0;
  right: 0;
  top: calc(
    var(--vv-offset-top, 0px) + var(--vv-height, 100dvh) - var(--bottom-tabs-height)
  );
  bottom: auto;
  z-index: 50;
  display: flex;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  padding-top: var(--bottom-tabs-pad-top);
  /* Extra clearance below tabs — Nimiq Pay / Android often report 0 for safe-area */
  padding-bottom: var(--bottom-tabs-pad-bottom);
  touch-action: none;
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  background: transparent;
  border-radius: 0;
}

.tab:active,
.tab:focus,
.tab:focus-visible {
  background: transparent;
  outline: none;
  box-shadow: none;
}

.tab :deep(.nq-icon) {
  width: 24px;
  height: 24px;
}

.tab-identicon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
}

.tab span {
  font-size: 0.75rem;
  font-weight: 500;
}

.tab.router-link-active {
  color: var(--primary);
}

.tab--me {
  color: var(--text-secondary);
}

.tab--me.router-link-active {
  color: var(--text-secondary);
}

.tab--me.router-link-active span {
  color: var(--primary);
}

.page-enter-active,
.page-leave-active {
  transition: opacity 0.15s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
