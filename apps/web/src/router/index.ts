import { createRouter, createWebHistory } from "vue-router";
import AppShell from "../views/AppShell.vue";
import Discover from "../views/Discover.vue";
import MyList from "../views/MyList.vue";
import Search from "../views/Search.vue";
import Activity from "../views/Activity.vue";
import Me from "../views/Me.vue";
import TitleDetail from "../views/TitleDetail.vue";
import User from "../views/User.vue";
import PublicProfile from "../views/PublicProfile.vue";
import TitleShare from "../views/TitleShare.vue";
import ShortShare from "../views/ShortShare.vue";
import Landing from "../views/Landing.vue";
import { ACTIVITY_UI_VISIBLE, RESERVED_PUBLIC_HANDLES } from "@cinima/shared";

const RESERVED = RESERVED_PUBLIC_HANDLES;

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "landing", component: Landing },
    /** Always shows Landing, including inside Nimiq Pay (local preview / QA). */
    { path: "/gate", name: "gate", component: Landing },
    {
      path: "/",
      component: AppShell,
      children: [
        { path: "discover", name: "discover", component: Discover },
        { path: "my-list", name: "my-list", component: MyList },
        { path: "search", name: "search", component: Search },
        {
          path: "activity",
          name: "activity",
          component: Activity,
          beforeEnter: () => (ACTIVITY_UI_VISIBLE ? true : { name: "discover" }),
        },
        { path: "me", name: "me", component: Me },
        { path: "title/:id", name: "title", component: TitleDetail, props: true },
        { path: "user/:wallet", name: "user", component: User, props: true },
      ],
    },
    {
      path: "/s/:code",
      name: "short-share",
      component: ShortShare,
      props: true,
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
