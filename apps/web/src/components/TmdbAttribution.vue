<template>
  <aside class="tmdb-attr" :class="`tmdb-attr--${variant}`">
    <a
      class="tmdb-logo-link"
      href="https://www.themoviedb.org/"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img
        class="tmdb-logo"
        src="@/assets/tmdb-logo.svg"
        alt="The Movie Database"
        width="185"
        height="24"
      />
    </a>
    <div class="tmdb-copy">
      <p class="notice">
        This application uses TMDB and the TMDB APIs but is not endorsed,
        certified, or otherwise approved by TMDB.
      </p>
      <p v-if="variant === 'legal'" class="legal">
        Movie and TV titles, posters, synopses, and ratings are sourced from
        <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer"
          >The Movie Database (TMDB)</a
        >. Cinima does not charge for this catalog data. Nimiq Pay is used only
        to identify your wallet.
      </p>
    </div>
  </aside>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: "compact" | "legal";
  }>(),
  { variant: "compact" }
);
</script>

<style scoped>
.tmdb-attr {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.55rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}

.tmdb-logo-link {
  display: inline-flex;
  line-height: 0;
  text-decoration: none;
  opacity: 0.92;
}

.tmdb-logo-link:hover {
  text-decoration: none;
  opacity: 1;
}

.tmdb-logo {
  display: block;
  height: 1.05rem;
  width: auto;
  max-width: 8.5rem;
}

.notice,
.legal {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--text-secondary);
}

.legal a {
  color: var(--primary);
}
</style>
