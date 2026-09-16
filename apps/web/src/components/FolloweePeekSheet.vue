<template>
  <Teleport to="body">
    <div class="peek-modal" role="presentation" @click.self="$emit('close')">
      <div
        class="peek-dialog nq-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="followee-peek-title"
      >
        <div class="popup-header">
          <h2 id="followee-peek-title">
            {{ profile ? displayName(profile.handle, profile.walletAddress) : "Followee" }}
          </h2>
          <button type="button" class="popup-close" aria-label="Close" @click="$emit('close')">
            <NqIcon name="cross" :size="20" />
          </button>
        </div>

        <div v-if="loading" class="state">
          <LoadingWait />
        </div>
        <div v-else-if="!profile" class="state muted">Couldn't load</div>

        <template v-else>
          <div class="who">
            <button
              type="button"
              class="who-face"
              aria-label="View Profile"
              @click="$emit('view-profile')"
            >
              <Identicon :address="profile.walletAddress" :size="52" alt="" />
            </button>
          </div>

          <section class="recommends">
            <div class="section-heading">
              <h3>Recommends</h3>
              <KindTabs v-model="kind" aria-label="Recommend media type" />
            </div>
            <PosterSlider
              :titles="visibleRecommends"
              gold="always"
              :max-rows="1"
              :empty="kind === 'tv' ? 'No TV Recommends yet' : 'No movie Recommends yet'"
              @select="$emit('open-title', $event)"
            />
          </section>

          <button
            type="button"
            class="nq-pill-blue nq-pill-stretch"
            @click="$emit('view-profile')"
          >
            View Profile
          </button>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { displayName, type MediaType, type PublicProfile, type TitleSummary } from "@cinima/shared";
import Identicon from "@/components/Identicon.vue";
import KindTabs from "@/components/KindTabs.vue";
import LoadingWait from "@/components/LoadingWait.vue";
import NqIcon from "@/components/NqIcon.vue";
import PosterSlider from "@/components/PosterSlider.vue";
import { pickDefaultMediaKind } from "@/lib/mediaKindDefault";

const props = defineProps<{
  profile: PublicProfile | null;
  loading: boolean;
}>();

defineEmits<{
  close: [];
  "view-profile": [];
  "open-title": [title: TitleSummary];
}>();

const kind = ref<MediaType>("movie");

const movieRecommends = computed(() =>
  (props.profile?.recommends ?? []).filter((t) => (t.mediaType || "movie") === "movie")
);
const tvRecommends = computed(() =>
  (props.profile?.recommends ?? []).filter((t) => t.mediaType === "tv")
);
const visibleRecommends = computed(() =>
  kind.value === "tv" ? tvRecommends.value : movieRecommends.value
);

watch(
  [movieRecommends, tvRecommends],
  ([movie, tv]) => {
    kind.value = pickDefaultMediaKind(movie.length, tv.length);
  },
  { immediate: true }
);
</script>

<style scoped>
.peek-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding:
    calc(var(--vv-offset-top, 0px) + var(--app-brand-row, 2.75rem) + 0.75rem)
    1.25rem
    calc(var(--bottom-tabs-inset, 5.5rem) + 0.75rem);
  background: transparent;
  box-sizing: border-box;
}

.peek-dialog {
  position: relative;
  width: min(100%, 26rem);
  max-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1.25rem 1.15rem 1.1rem;
  overflow: auto;
}

.peek-dialog .popup-header h2 {
  font-size: 1.15rem;
}

.who {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
}

.who-face {
  display: flex;
  padding: 0;
  border: 0;
  background: transparent;
  border-radius: 50%;
  line-height: 0;
  cursor: pointer;
}

.state {
  min-height: 8rem;
  display: grid;
  place-items: center;
}

.state.muted {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.recommends h3 {
  margin: 0;
  font-size: 1rem;
}

.section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.65rem;
}
</style>
