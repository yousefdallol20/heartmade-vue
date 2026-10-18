<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import SiteHeader from "./components/SiteHeader.vue";
import SiteFooter from "./components/SiteFooter.vue";
import SubpageHeader from "./components/SubpageHeader.vue";
import CartDrawer from "./components/CartDrawer.vue";
import { notice } from "./stores/shop.js";

const route = useRoute();
const mainHeader = computed(() =>
  ["/", "/catalog", "/story"].includes(route.path),
);
</script>
<template>
  <div
    class="notice-toast"
    :class="{ show: notice }"
    role="status"
    aria-live="polite"
  >
    <i class="bi bi-heart-fill"></i
    ><span class="notice-text">{{ notice }}</span>
  </div>
  <SiteHeader v-if="mainHeader" />
  <SubpageHeader v-else-if="['/product', '/corporate'].includes(route.path)" />
  <RouterView />
  <SiteFooter v-if="!route.path.startsWith('/admin')" :alt="route.path !== '/'" />
  <CartDrawer v-if="!route.path.startsWith('/admin')" />
</template>
