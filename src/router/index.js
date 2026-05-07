import { createRouter, createWebHashHistory } from "vue-router";
import Timer from "../views/Timer.vue";
import Records from "../views/Records.vue";
import Stats from "../views/Stats.vue";
import Settings from "../views/Settings.vue";

const routes = [
  {
    path: "/",
    name: "Timer",
    component: Timer,
  },
  {
    path: "/records",
    name: "Records",
    component: Records,
  },
  {
    path: "/stats",
    name: "Stats",
    component: Stats,
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
