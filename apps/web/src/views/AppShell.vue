<template>
  <div class="app-shell">
    <header class="app-brand" :class="{ 'app-brand--hidden': brandHidden }">
      <span class="brand-mark" aria-hidden="true" v-html="brandIcon" />
      <BrandWordmark size="sm" animate />
    </header>

    <div
      ref="contentEl"
      class="app-content"
      :class="{ 'app-content--brand-hidden': brandHidden }"
      @scroll.passive="onContentScroll"
    >
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </div>
    <nav class="bottom-tabs">
      <RouterLink to="/discover" class="tab">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        </svg>
        <span>Discover</span>
      </RouterLink>
      <RouterLink to="/search" class="tab">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
          <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>Search</span>
      </RouterLink>
      <RouterLink to="/activity" class="tab">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
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
import { computed, onMounted, ref, watch } from "vue";
import { RouterView, RouterLink, useRoute } from "vue-router";
import { useFavoritesStore } from "@/stores/favorites";
import { useAuthStore } from "@/stores/auth";
import { nqHexOutlineSvg } from "@/lib/nqIcon";
import BrandWordmark from "@/components/BrandWordmark.vue";
import Identicon from "@/components/Identicon.vue";

const favoritesStore = useFavoritesStore();
const authStore = useAuthStore();
const route = useRoute();
const walletAddress = computed(() => authStore.user?.walletAddress || "");
const brandIcon = nqHexOutlineSvg({ class: "brand-mark-icon", width: 20, height: 19 });

const contentEl = ref<HTMLElement | null>(null);
const brandHidden = ref(false);
let lastScrollTop = 0;

function onContentScroll() {
  const el = contentEl.value;
  if (!el) return;
  const y = el.scrollTop;
  const delta = y - lastScrollTop;

  if (y < 16) {
    brandHidden.value = false;
  } else if (delta > 6) {
    brandHidden.value = true;
  } else if (delta < -6) {
    brandHidden.value = false;
  }

  lastScrollTop = y;
}

watch(
  () => route.fullPath,
  () => {
    brandHidden.value = false;
    lastScrollTop = contentEl.value?.scrollTop ?? 0;
  }
);

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
  --app-brand-row: 2.75rem;
  height: 100dvh;
  overflow: hidden;
  overscroll-behavior: none;
  background: var(--bg-primary);
}

.app-brand {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 45;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  height: var(--app-brand-row);
  padding: 0 1rem;
  background: rgba(10, 10, 15, 0.92);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transform: translateY(0);
  transition: transform 0.22s ease;
  pointer-events: none;
}

.app-brand--hidden {
  transform: translateY(-100%);
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  line-height: 0;
}

.brand-mark :deep(.nq-icon),
.brand-mark :deep(.brand-mark-icon) {
  width: 1.25rem;
  height: 1.2rem;
  display: block;
}

.app-content {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  padding-top: var(--app-brand-row);
  padding-bottom: var(--bottom-tabs-height);
  transition: padding-top 0.22s ease;
}

.app-content--brand-hidden {
  padding-top: 0;
}

.bottom-tabs {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  padding-top: var(--bottom-tabs-pad-top);
  /* Extra clearance below tabs — Nimiq Pay / Android often report 0 for safe-area */
  padding-bottom: var(--bottom-tabs-pad-bottom);
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

.tab svg {
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
