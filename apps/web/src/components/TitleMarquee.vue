<template>
  <div class="title-marquee" aria-hidden="true">
    <div class="title-marquee-track">
      <ul
        v-for="copy in 2"
        :key="copy"
        class="title-marquee-list"
      >
        <li
          v-for="poster in landingPosters"
          :key="`${copy}-${poster.id}`"
          class="title-marquee-item"
        >
          <img
            class="title-marquee-poster"
            :src="poster.src"
            :alt="poster.alt"
            width="90"
            height="135"
            loading="eager"
            decoding="async"
            draggable="false"
          />
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { landingPosters } from "@/lib/landingPosters";
</script>

<style scoped>
.title-marquee {
  position: relative;
  width: 100%;
  overflow: hidden;
  mask-image: linear-gradient(
    90deg,
    transparent 0%,
    #000 6%,
    #000 94%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    90deg,
    transparent 0%,
    #000 6%,
    #000 94%,
    transparent 100%
  );
}

.title-marquee-track {
  display: flex;
  width: max-content;
  animation: title-marquee-scroll 48s linear infinite;
}

.title-marquee-list {
  display: flex;
  align-items: stretch;
  gap: 0.55rem;
  margin: 0;
  padding: 0 0.275rem;
  list-style: none;
}

.title-marquee-item {
  flex: 0 0 auto;
}

.title-marquee-poster {
  display: block;
  width: 5.625rem;
  height: 8.4375rem;
  object-fit: cover;
  border-radius: 0.35rem;
  background: var(--bg-surface);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
  pointer-events: none;
  user-select: none;
}

@keyframes title-marquee-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .title-marquee-track {
    animation: none;
    transform: translateX(0);
  }
}
</style>
