<script setup>
import { useNavigation } from "../composables/navigation.js";
const { navigate } = useNavigation();
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";
import { cartCount, cartOpen } from "../stores/shop.js";
import heartMadeLogo from "../assets/images/heart-made-logo.png";
const route = useRoute();
const menuOpen = ref(false),
  scrolled = ref(false);
function openCartDrawer() {
  cartOpen.value = true;
}
function onScroll() {
  scrolled.value = window.scrollY > 20;
}
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false;
  },
);
onMounted(() => {
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
});
onUnmounted(() => window.removeEventListener("scroll", onScroll));
</script>
<template>
  <header
    :class="{ solid: route.path !== '/' || scrolled }"
    class="site-header"
    id="siteHeader"
  >
    <div class="header-row">
      <button
        aria-label="Go to homepage"
        class="header-logo-button"
        @click="navigate('index.html')"
        type="button"
      >
        <img :src="heartMadeLogo" alt="Heart Made Zone" class="header-logo" />
      </button>
      <nav class="main-nav">
        <button
          :class="{ active: route.path === '/catalog' }"
          @click="navigate('catalog.html')"
          type="button"
        >
          Shop
        </button>
        <button
          :class="{ active: route.path === '/story' }"
          @click="navigate('story.html')"
          type="button"
        >
          Our Story
        </button>
        <button @click="navigate('index.html#impact')" type="button">
          Inside Heart Made Zone
        </button>
        <button @click="navigate('b2b.html')" type="button">
          Corporate Gifting
        </button>
      </nav>
      <div class="header-actions">
        <button
          aria-label="Open Cart"
          class="cart-btn"
          @click="openCartDrawer()"
          type="button"
        >
          <i class="bi bi-bag" style="font-size: 18px"></i>
          <span class="cart-badge" v-show="cartCount &gt; 0">{{
            cartCount
          }}</span>
        </button>
        <button
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
          class="menu-toggle"
          id="menuToggle"
          type="button"
        >
          <i
            :class="menuOpen ? 'bi bi-x-lg' : 'bi bi-list'"
            style="font-size: 18px"
          ></i>
        </button>
      </div>
    </div>
    <div :class="{ open: menuOpen }" class="mobile-menu" id="mobileMenu">
      <button class="shop-link" @click="navigate('catalog.html')" type="button">
        Shop
      </button>
      <button @click="navigate('story.html')" type="button">Our Story</button>
      <button @click="navigate('index.html#impact')" type="button">
        Inside Heart Made Zone
      </button>
      <button @click="navigate('b2b.html')" type="button">
        Corporate Gifting
      </button>
    </div>
  </header>
</template>

<style scoped>
.header-logo-button {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.header-logo {
  display: block;
  width: 58px;
  height: 58px;
  border-radius: 8px;
  object-fit: cover;
}

@media (min-width: 640px) {
  .header-logo {
    width: 72px;
    height: 72px;
  }
}
</style>
