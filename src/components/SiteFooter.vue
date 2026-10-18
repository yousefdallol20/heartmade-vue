<script setup>
import { useNavigation } from "../composables/navigation.js";
const { navigate } = useNavigation();
defineProps({ alt: Boolean });
import { computed } from "vue";
import { useRoute } from "vue-router";
import { settings, showNotice } from "../stores/shop.js";
const route = useRoute();
const layouts = {
  "/": {
    links: [
      { label: "Shop Catalog", target: "catalog.html" },
      { label: "Our Story", target: "story.html" },
      { label: "Corporate Gifting", target: "b2b.html" },
    ],
    legal: true,
    logoSize: 28,
  },
  "/catalog": {
    links: [
      { label: "Shop Catalog", target: "catalog.html" },
      { label: "Our Story", target: "index.html#story" },
    ],
    legal: false,
    logoSize: 28,
  },
  "/story": {
    links: [
      { label: "Shop Catalog", target: "catalog.html" },
      { label: "Our Story", target: "story.html" },
      {
        label: "Inside Heart Made\n                                Zone",
        target: "index.html#impact",
      },
      {
        label: "Corporate\n                                Gifting",
        target: "index.html#corporate",
      },
    ],
    legal: false,
    logoSize: 28,
  },
  "/product": {
    links: [
      { label: "Shop Collection", target: "index.html#shop" },
      { label: "Our Story", target: "index.html#story" },
      { label: "Corporate Gifting", target: "b2b.html" },
    ],
    legal: true,
    logoSize: 26,
  },
  "/checkout": {
    links: [
      { label: "Shop Catalog", target: "index.html" },
      { label: "Corporate Gifting", target: "b2b.html" },
    ],
    legal: false,
    logoSize: 26,
  },
  "/corporate": {
    links: [
      { label: "Shop Catalog", target: "index.html" },
      { label: "Our Story", target: "index.html#story" },
    ],
    legal: false,
    logoSize: 26,
  },
};
const layout = computed(() => layouts[route.path] || layouts["/"]);
</script>
<template>
  <footer class="site-footer" :class="{ alt }">
    <div class="footer-container">
      <div class="footer-grid">
        <div class="footer-brand">
          <span
            class="logo-script"
            :style="{
              fontSize: layout.logoSize + 'px',
              display: 'block',
              pointerEvents: 'none',
            }"
            >Heart Made</span
          >
          <p>
            A creative social enterprise in Amman where young adults create
            meaningful products, work, contribute, and earn.
          </p>
        </div>
        <div class="footer-col">
          <h4>Explore</h4>
          <ul>
            <li v-for="item in layout.links" :key="item.label">
              <button type="button" @click="navigate(item.target)">
                {{ item.label }}
              </button>
            </li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Contact</h4>
          <ul class="footer-contact">
            <li>
              <i class="bi bi-envelope"></i>
              <a :href="'mailto:' + settings.settingEmail">{{
                settings.settingEmail
              }}</a>
            </li>
            <li>{{ settings.settingLocation }}</li>
          </ul>
          <div class="footer-social">
            <a
              aria-label="Instagram"
              class="social-btn"
              :href="settings.settingInstagram"
              rel="noopener noreferrer"
              target="_blank"
              ><i class="bi bi-instagram"></i
            ></a>
            <a
              aria-label="Facebook"
              class="social-btn"
              :href="settings.settingFacebook"
              rel="noopener noreferrer"
              target="_blank"
              ><i class="bi bi-facebook"></i
            ></a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© 2026 Heart Made Zone. All rights reserved.</p>
        <div v-if="layout.legal" class="links">
          <button
            type="button"
            @click="showNotice('Privacy policy content has not been provided.')"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            @click="
              showNotice('Terms of service content has not been provided.')
            "
          >
            Terms of Service
          </button>
        </div>
      </div>
    </div>
  </footer>
</template>
