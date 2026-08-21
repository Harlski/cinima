<template>
  <section class="heatmap-section">
    <div class="heatmap-header">
      <h3>Episode Ratings</h3>
    </div>

    <div class="heatmap-container">
      <div class="heatmap-blur">
        <div v-if="seasons.length === 0" class="empty">
          No episode data available
        </div>

        <div v-else class="heatmap-grid">
          <div class="season-labels">
            <div class="label-header">E</div>
            <div
              v-for="ep in maxEpisodes"
              :key="`row-${ep}`"
              class="season-label"
            >
              {{ ep }}
            </div>
          </div>

          <div class="episodes-grid">
            <div class="episode-labels">
              <div
                v-for="season in seasons"
                :key="`col-${season}`"
                class="episode-label"
              >
                {{ season }}
              </div>
            </div>

            <div class="cells">
              <div
                v-for="season in seasons"
                :key="season"
                class="season-column"
              >
                <button
                  v-for="ep in maxEpisodes"
                  :key="`${season}-${ep}`"
                  type="button"
                  class="cell"
                  :class="[
                    getCellClass(season, ep),
                    {
                      selectable: canSelect(season, ep),
                      selected: isSelected(season, ep),
                    },
                  ]"
                  :disabled="!canSelect(season, ep)"
                  :aria-label="getCellTitle(season, ep)"
                  @click="selectEpisode(season, ep)"
                >
                  <span>{{ getCellValue(season, ep) }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selected" class="episode-detail">
      <div class="detail-top">
        <div>
          <p class="detail-code">S{{ selected.season }} · E{{ selected.episode }}</p>
          <h4>{{ selected.name || `Episode ${selected.episode}` }}</h4>
        </div>
        <div
          v-if="selected.rating != null"
          class="detail-rating"
          :class="ratingTone(selected.rating)"
        >
          {{ selected.rating.toFixed(1) }}
        </div>
        <div v-else class="detail-rating muted">---</div>
      </div>
      <p class="detail-meta">Episode rating</p>
      <ExpandableText
        v-if="selected.overview"
        class="detail-overview"
        :text="selected.overview"
        :lines="4"
      />
      <div class="detail-actions">
        <button type="button" class="nq-pill-secondary" @click="selected = null">Close</button>
        <a
          v-if="imdbUrl"
          class="nq-pill-secondary"
          :href="imdbUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on IMDb
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { imdbTitleUrl, type EpisodeCell } from "@cinima/shared";
import ExpandableText from "@/components/ExpandableText.vue";

const props = defineProps<{
  episodes: EpisodeCell[];
}>();

const selected = ref<EpisodeCell | null>(null);
const imdbUrl = computed(() => imdbTitleUrl(selected.value?.imdbId));

const episodeMap = computed(() => {
  const map = new Map<string, EpisodeCell>();
  for (const ep of props.episodes) {
    map.set(`${ep.season}-${ep.episode}`, ep);
  }
  return map;
});

const seasons = computed(() => {
  const s = new Set(props.episodes.map((e) => e.season));
  return Array.from(s).sort((a, b) => a - b);
});

const maxEpisodes = computed(() => {
  const counts = props.episodes.reduce((acc, ep) => {
    acc[ep.season] = Math.max(acc[ep.season] || 0, ep.episode);
    return acc;
  }, {} as Record<number, number>);
  return Math.max(...Object.values(counts), 0);
});

const getCellValue = (season: number, episode: number): string => {
  const ep = episodeMap.value.get(`${season}-${episode}`);
  if (!ep) return "";
  if (ep.rating == null) return "---";
  return ep.rating.toFixed(1);
};

const getCellClass = (season: number, episode: number): string => {
  const ep = episodeMap.value.get(`${season}-${episode}`);
  if (!ep) return "cell-empty";
  if (ep.rating == null) return "cell-locked";

  const rating = ep.rating;
  if (rating >= 9.0) return "cell-excellent";
  if (rating >= 8.0) return "cell-great";
  if (rating >= 7.0) return "cell-good";
  if (rating >= 6.0) return "cell-okay";
  return "cell-poor";
};

const getCellTitle = (season: number, episode: number): string => {
  const ep = episodeMap.value.get(`${season}-${episode}`);
  if (!ep) return "";
  const name = ep.name || `Episode ${episode}`;
  const rating = ep.rating != null ? ` (${ep.rating.toFixed(1)})` : "";
  return `S${season}E${episode}: ${name}${rating}`;
};

const canSelect = (season: number, episode: number) => {
  return !!episodeMap.value.get(`${season}-${episode}`);
};

const isSelected = (season: number, episode: number) =>
  !!selected.value &&
  selected.value.season === season &&
  selected.value.episode === episode;

const selectEpisode = (season: number, episode: number) => {
  if (!canSelect(season, episode)) return;
  const ep = episodeMap.value.get(`${season}-${episode}`);
  if (!ep) return;
  if (isSelected(season, episode)) {
    selected.value = null;
    return;
  }
  selected.value = ep;
};

const ratingTone = (rating: number) => {
  if (rating >= 9) return "tone-excellent";
  if (rating >= 8) return "tone-great";
  if (rating >= 7) return "tone-good";
  if (rating >= 6) return "tone-okay";
  return "tone-poor";
};
</script>

<style scoped>
.heatmap-section {
  margin-bottom: 2rem;
}

.heatmap-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.heatmap-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.heatmap-container {
  position: relative;
  background: var(--bg-surface);
  border-radius: 12px;
  padding: 1rem;
  overflow-x: auto;
}

.empty {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.heatmap-grid {
  display: flex;
  gap: 0.5rem;
}

.season-labels {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.label-header {
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.season-label {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.episodes-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.episode-labels {
  display: flex;
  gap: 2px;
}

.episode-label {
  width: 32px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.cells {
  display: flex;
  gap: 2px;
}

.season-column {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cell {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: 0;
  padding: 0;
  font-size: 0.7rem;
  font-weight: 600;
  font-family: inherit;
  cursor: default;
  transition: transform 0.15s, box-shadow 0.15s, opacity 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.cell.selectable {
  cursor: pointer;
}

.cell.selectable:active {
  transform: scale(0.96);
}

.cell.selected {
  box-shadow: 0 0 0 2px #fff;
  transform: scale(1.08);
  z-index: 1;
}

.cell:disabled {
  opacity: 1;
}

.cell-empty {
  background: transparent;
  visibility: hidden;
}

.cell-locked {
  background: var(--bg-primary);
  color: var(--text-secondary);
}

.cell-excellent {
  background: var(--colors-green);
  color: var(--colors-darkerblue);
}

.cell-great {
  background: var(--colors-green-1100);
  color: var(--colors-darkerblue);
}

.cell-good {
  background: var(--colors-gold);
  color: var(--colors-darkerblue);
}

.cell-okay {
  background: var(--colors-orange);
  color: var(--colors-darkerblue);
}

.cell-poor {
  background: var(--colors-red);
  color: white;
}

.episode-detail {
  margin-top: 0.75rem;
  padding: 0.9rem 1rem;
  background: var(--bg-surface);
  border-radius: 12px;
  border: 1px solid var(--border);
}

.detail-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.detail-code {
  margin: 0 0 0.2rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.detail-top h4 {
  margin: 0;
  font-size: 1.05rem;
  color: var(--text-primary);
}

.detail-rating {
  flex-shrink: 0;
  min-width: 2.5rem;
  padding: 0.35rem 0.55rem;
  border-radius: 8px;
  text-align: center;
  font-weight: 700;
  font-size: 1rem;
  color: #fff;
}

.detail-rating.muted {
  background: var(--bg-primary);
  color: var(--text-secondary);
}

.tone-excellent { background: var(--colors-green); }
.tone-great { background: var(--colors-green-1100); }
.tone-good { background: var(--colors-gold); }
.tone-okay { background: var(--colors-orange); }
.tone-poor { background: var(--colors-red); }

.detail-meta {
  margin: 0.45rem 0 0.75rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.detail-overview {
  margin: -0.25rem 0 0.85rem;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.detail-actions a {
  text-decoration: none;
}

@media (max-width: 640px) {
  .heatmap-container {
    padding: 0.5rem;
  }

  .cell,
  .season-label,
  .episode-label {
    width: 28px;
    height: 28px;
  }

  .episode-label {
    height: 20px;
  }
}
</style>
