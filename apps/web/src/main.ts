import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router";
import "./assets/style.css";

const app = createApp(App);
app.use(createPinia());
app.use(router);

// Resolve the initial route before mount so App does not boot wallet auth
// against Vue Router's START_LOCATION (path `/`, name undefined).
router.isReady().then(() => {
  app.mount("#app");
});
