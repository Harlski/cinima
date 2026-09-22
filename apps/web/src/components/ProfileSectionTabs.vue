<template>
  <div class="profile-sections">
    <div class="tabs" role="tablist" aria-label="Profile sections">
      <span class="indicator" :style="indicatorStyle" aria-hidden="true" />
      <button
        v-for="section in PROFILE_SECTIONS"
        :id="tabId(section.id)"
        :key="section.id"
        type="button"
        role="tab"
        class="tab"
        :aria-selected="active === section.id"
        :aria-controls="panelId(section.id)"
        :tabindex="active === section.id ? 0 : -1"
        @click="select(section.id)"
        @keydown="onKeydown"
      >
        {{ section.label }}
      </button>
    </div>
    <div
      :id="panelId(active)"
      class="pane"
      role="tabpanel"
      :aria-labelledby="tabId(active)"
    >
      <slot :name="active" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  DEFAULT_PROFILE_SECTION,
  PROFILE_SECTIONS,
  type ProfileSectionId,
} from "@/lib/profileSections";
import { useGuidedTourStore } from "@/stores/guidedTour";

const active = ref<ProfileSectionId>(DEFAULT_PROFILE_SECTION);
const tour = useGuidedTourStore();

const indicatorStyle = computed(() => {
  const index = PROFILE_SECTIONS.findIndex((section) => section.id === active.value);
  return { transform: `translateX(${index * 100}%)` };
});

function tabId(id: ProfileSectionId) {
  return `profile-section-tab-${id}`;
}

function panelId(id: ProfileSectionId) {
  return `profile-section-panel-${id}`;
}

function select(id: ProfileSectionId) {
  if (tour.step?.id === "creator-taste") return;
  active.value = id;
}

function onKeydown(event: KeyboardEvent) {
  const index = PROFILE_SECTIONS.findIndex((section) => section.id === active.value);
  if (event.key === "ArrowRight") {
    event.preventDefault();
    select(PROFILE_SECTIONS[(index + 1) % PROFILE_SECTIONS.length]!.id);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    select(PROFILE_SECTIONS[(index - 1 + PROFILE_SECTIONS.length) % PROFILE_SECTIONS.length]!.id);
  }
}

watch(
  () => tour.step?.id,
  (id) => {
    if (id === "creator-taste") active.value = "likes";
  },
  { immediate: true }
);
</script>

<style scoped>
.profile-sections {
  display: flex;
  flex-direction: column;
}

.tabs {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 1px solid var(--border);
}

.indicator {
  position: absolute;
  left: 0;
  bottom: 0;
  width: calc(100% / 3);
  height: 2px;
  background: var(--gold);
  transition: transform 0.22s cubic-bezier(0.25, 0, 0, 1);
}

.tab {
  position: relative;
  z-index: 1;
  padding: 0.72rem 0.25rem 0.65rem;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.92rem;
  font-weight: 650;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.tab[aria-selected="true"] {
  color: var(--text-primary);
}

.tab:active {
  opacity: 0.85;
}

.pane {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-height: 10rem;
  padding-top: 0.9rem;
}

.pane :deep(.profile-section-empty) {
  margin: 0.35rem 1rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

@media (prefers-reduced-motion: reduce) {
  .indicator {
    transition: none;
  }
}
</style>
