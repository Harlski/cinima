<template>
  <Teleport to="body">
    <TitleFlightClone
      v-for="flight in flights"
      :key="flight.id"
      :flight="flight"
      @hint="store.flashTab(flight.kind)"
      @done="store.dismiss(flight.id)"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import TitleFlightClone from "@/components/TitleFlightClone.vue";
import { useTitleFlightStore } from "@/stores/titleFlight";

const store = useTitleFlightStore();
const { flights } = storeToRefs(store);
</script>
