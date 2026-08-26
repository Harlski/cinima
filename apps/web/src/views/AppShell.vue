<template>
  <div class="app-shell">
    <AppBrandHeader fixed link-to-landing />

    <div class="app-content">
      <div class="app-column">
        <RouterView v-slot="{ Component, route }">
          <Transition name="page" mode="out-in">
            <KeepAlive include="Discover,MyList">
              <component :is="Component" :key="route.path" />
            </KeepAlive>
          </Transition>
        </RouterView>
      </div>
    </div>
    <nav class="bottom-tabs">
      <TourSpotlight :id="TOUR_SPOTLIGHT.tabDiscover" radius="10px" fit>
        <RouterLink
          to="/discover"
          class="tab"
          :data-tour="TOUR_SPOTLIGHT.tabDiscover"
        >
          <NqIcon name="cinema-tickets" :size="24" />
          <span>Discover</span>
        </RouterLink>
      </TourSpotlight>
      <TourSpotlight :id="TOUR_SPOTLIGHT.tabWatchlist" radius="10px" fit>
        <RouterLink
          to="/my-list"
          class="tab"
          :data-tour="TOUR_SPOTLIGHT.tabWatchlist"
        >
          <NqIcon name="tickets" :size="24" />
          <span>Watchlist</span>
        </RouterLink>
      </TourSpotlight>
      <TourSpotlight :id="TOUR_SPOTLIGHT.tabSearch" radius="10px" fit>
        <RouterLink
          to="/search"
          class="tab"
          :data-tour="TOUR_SPOTLIGHT.tabSearch"
        >
          <NqIcon name="magnifying-glass" :size="24" />
          <span>Search</span>
        </RouterLink>
      </TourSpotlight>
      <RouterLink v-if="ACTIVITY_UI_VISIBLE" to="/activity" class="tab">
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

    <GuidedTourHost />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { RouterView, RouterLink, useRoute } from "vue-router";
import { ACTIVITY_UI_VISIBLE } from "@cinima/shared";
import { useViewportChromeLock } from "@/composables/useViewportChromeLock";
import { useFavoritesStore } from "@/stores/favorites";
import { useWatchlistStore } from "@/stores/watchlist";
import { useAuthStore } from "@/stores/auth";
import AppBrandHeader from "@/components/AppBrandHeader.vue";
import GuidedTourHost from "@/components/GuidedTourHost.vue";
import Identicon from "@/components/Identicon.vue";
import NqIcon from "@/components/NqIcon.vue";
import TourSpotlight from "@/components/TourSpotlight.vue";
import { TOUR_SPOTLIGHT } from "@/lib/guidedTour";

useViewportChromeLock();

const route = useRoute();
const favoritesStore = useFavoritesStore();
const watchlistStore = useWatchlistStore();
const authStore = useAuthStore();
const walletAddress = computed(() => authStore.user?.walletAddress || "");

function resetAppContentScroll() {
  const el = document.querySelector(".app-content");
  if (el instanceof HTMLElement) el.scrollTop = 0;
}

// Search uses fixed stage/dock; any leftover shell scroll from rubber-band
// would shift Discover / Watchlist / Me after leaving Search.
watch(
  () => route.name,
  (name, prev) => {
    if (name === "search" || prev === "search") resetAppContentScroll();
  }
);

onMounted(() => {
  favoritesStore.load();
  watchlistStore.load();
});
</script>

<style scoped>
.app-shell {
  /* Keep in sync with .bottom-tabs padding + tab row (icon + label + tab padding) */
  --bottom-tabs-pad-top: 0.5rem;
  --bottom-tabs-pad-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
  /* 26px matches Me identicon (svg tabs are 24px) */
  --bottom-tabs-inner: calc(0.5rem + 26px + 0.25rem + 1.125rem + 0.5rem);
  /* Visual bar height — never collapsed (used for positioning + slide) */
  --bottom-tabs-bar-height: calc(
    var(--bottom-tabs-pad-top) + var(--bottom-tabs-inner) + var(--bottom-tabs-pad-bottom)
  );
  --bottom-tabs-height: var(--bottom-tabs-bar-height);
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
  padding-top: calc(var(--app-brand-row) + var(--vv-offset-top, 0px));
  padding-bottom: var(--bottom-tabs-inset);
  transition: padding-bottom 0.38s cubic-bezier(0.25, 0, 0, 1);
}

/* Favorites / handle onboarding: full-bleed pick UI; tab bar stays mounted for slide-in */
.app-shell:has(.discover--onboarding),
.app-shell:has(.discover--handle) {
  --bottom-tabs-height: 0px;
  --bottom-tabs-inset: calc(env(safe-area-inset-bottom, 0px) + var(--vv-bottom-inset, 0px));
}

.app-shell:has(.discover--onboarding) .app-content,
.app-shell:has(.discover--handle) .app-content {
  /* Snap inset closed when entering onboarding — no slide-down */
  transition: none;
}

.bottom-tabs {
  position: fixed;
  left: 0;
  right: 0;
  top: calc(
    var(--vv-offset-top, 0px) + var(--vv-height, 100dvh) - var(--bottom-tabs-bar-height)
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
  transform: translateY(0);
  visibility: visible;
  transition:
    transform 0.38s cubic-bezier(0.25, 0, 0, 1),
    visibility 0s linear 0s;
  will-change: transform;
}

.app-shell:has(.discover--onboarding) .bottom-tabs,
.app-shell:has(.discover--handle) .bottom-tabs {
  transform: translateY(100%);
  pointer-events: none;
  visibility: hidden;
  /* Instant hide on enter; slide-up uses the default transition when leaving */
  transition: none;
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

@media (prefers-reduced-motion: reduce) {
  .app-content,
  .bottom-tabs {
    transition: none;
  }

  .app-shell:has(.discover--onboarding) .bottom-tabs {
    transition: none;
  }
}
</style>
