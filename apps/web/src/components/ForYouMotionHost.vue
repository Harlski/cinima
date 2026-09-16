<template>
  <Teleport to="body">
    <div
      v-for="fizzle in fizzles"
      :key="`fizzle-${fizzle.id}`"
      class="for-you-motion"
      :style="boxStyle(fizzle.from)"
    >
      <PassFizzleClone :flight="fizzle" @done="store.dismissFizzle(fizzle.id)" />
    </div>
    <div
      v-for="refill in refills"
      :key="`refill-${refill.id}`"
      class="for-you-motion"
      :style="boxStyle(refill.to)"
    >
      <ForYouRefillClone :flight="refill" @done="store.dismissRefill" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ForYouRefillClone from "@/components/ForYouRefillClone.vue";
import PassFizzleClone from "@/components/PassFizzleClone.vue";
import type { TitleFlightBox } from "@/lib/titleFlight";
import { useForYouMotionStore } from "@/stores/forYouMotion";

const store = useForYouMotionStore();
const { fizzles, refills } = storeToRefs(store);

function boxStyle(from: TitleFlightBox) {
  return {
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
  };
}
</script>

<style scoped>
.for-you-motion {
  position: fixed;
  z-index: 70;
  pointer-events: none;
  transform-origin: center center;
  overflow: visible;
}
</style>
