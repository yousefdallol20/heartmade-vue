import { createRouter, createWebHashHistory } from "vue-router";
import { checkSession } from "./stores/auth.js";
const routes = [
  { path: "/admin/login", component: () => import("./views/AdminAuthView.vue"), meta: { title: "Admin sign in" } },
  { path: "/admin/forgot-password", component: () => import("./views/AdminAuthView.vue"), meta: { title: "Forgot password" } },
  { path: "/admin/reset-password", component: () => import("./views/AdminAuthView.vue"), meta: { title: "Reset password" } },
  {
    path: "/",
    component: () => import("./views/HomeView.vue"),
    meta: { title: "Thoughtful handmade gifts from Amman" },
  },
  {
    path: "/catalog",
    component: () => import("./views/CatalogView.vue"),
    meta: { title: "Catalog" },
  },
  {
    path: "/product",
    component: () => import("./views/ProductView.vue"),
    meta: { title: "Product" },
  },
  {
    path: "/story",
    component: () => import("./views/StoryView.vue"),
    meta: { title: "Our Story" },
  },
  {
    path: "/corporate",
    component: () => import("./views/CorporateView.vue"),
    meta: { title: "Corporate Gifting" },
  },
  {
    path: "/checkout",
    component: () => import("./views/CheckoutView.vue"),
    meta: { title: "Checkout" },
  },
  {
    path: "/admin",
    component: () => import("./views/AdminView.vue"),
    meta: { title: "Admin Space", requiresAuth: true },
  },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];
const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved;
    if (to.hash) return { el: to.hash, top: 80, behavior: "smooth" };
    return { top: 0 };
  },
});
router.beforeEach(async (to) => {
  if (to.meta.requiresAuth && !(await checkSession())) return "/admin/login";
});
router.afterEach((to) => {
  document.title = to.meta.title + " — Heart Made Zone";
  document.body.style.background =
    to.path === "/" ? "var(--cream)" : "var(--cream-2)";
});
export default router;
