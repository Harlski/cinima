import { createRouter, createWebHistory } from "vue-router";
import AppShell from "../views/AppShell.vue";
import Discover from "../views/Discover.vue";
import Search from "../views/Search.vue";
import Activity from "../views/Activity.vue";
import Me from "../views/Me.vue";
import TitleDetail from "../views/TitleDetail.vue";
import User from "../views/User.vue";
import PublicProfile from "../views/PublicProfile.vue";
import TitleShare from "../views/TitleShare.vue";
import PayGate from "../views/PayGate.vue";

const RESERVED = new Set([
  "gate",
  "discover",
  "search",
  "activity",
  "me",
  "title",
  "user",
  "api",
  "health",
]);

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/gate", name: "gate", component: PayGate },
    {
      path: "/",
      component: AppShell,
      children: [
        { path: "", redirect: "/discover" },
        { path: "discover", name: "discover", component: Discover },
        { path: "search", name: "search", component: Search },
        { path: "activity", name: "activity", component: Activity },
        { path: "me", name: "me", component: Me },
        { path: "title/:id", name: "title", component: TitleDetail, props: true },
        { path: "user/:wallet", name: "user", component: User, props: true },
      ],
    },
    {
      path: "/:handle/t/:mediaType/:tmdbId",
      name: "title-share",
      component: TitleShare,
      props: true,
      beforeEnter: (to) => {
        const handle = String(to.params.handle || "").toLowerCase();
        const media = String(to.params.mediaType || "");
        if (RESERVED.has(handle)) return { name: "discover" };
        if (media !== "movie" && media !== "tv") {
          return { name: "public", params: { username: handle } };
        }
        return true;
      },
    },
    {
      path: "/:username",
      name: "public",
      component: PublicProfile,
      props: true,
      beforeEnter: (to) => {
        const u = String(to.params.username || "").toLowerCase();
        if (RESERVED.has(u)) return { name: "discover" };
        return true;
      },
    },
  ],
});
