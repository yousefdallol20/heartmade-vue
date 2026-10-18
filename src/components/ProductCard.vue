<script setup>
import { computed } from "vue";
import { useNavigation } from "../composables/navigation.js";
import { addToCart } from "../stores/shop.js";
const props = defineProps({
  product: { type: Object, required: true },
  catalog: Boolean,
});
const { navigate } = useNavigation();
const unavailable = computed(
  () => props.product.category === "Soon" || Number(props.product.stock) <= 0,
);
function open() {
  navigate("product.html?id=" + encodeURIComponent(props.product.id));
}
</script>
<template>
  <article v-if="catalog" class="cat-card">
    <div>
      <div
        class="cat-thumb"
        role="link"
        tabindex="0"
        @click="open"
        @keydown.enter="open"
      >
        <img :src="product.image_url" :alt="product.name" loading="lazy" /><span
          class="cat-badge"
          >{{ product.category }}</span
        >
      </div>
      <div
        class="cat-body"
        role="link"
        tabindex="0"
        @click="open"
        @keydown.enter="open"
      >
        <h3>{{ product.name }}</h3>
        <p>{{ product.description }}</p>
      </div>
    </div>
    <div class="cat-footer-row">
      <span class="cat-price">{{ Number(product.price).toFixed(2) }} JD</span
      ><button
        type="button"
        class="btn-add-cat"
        :disabled="unavailable"
        @click="addToCart(product)"
      >
        <i :class="unavailable ? 'bi bi-clock-history' : 'bi bi-bag'"></i
        ><span>{{ unavailable ? "Coming Soon" : "Add" }}</span>
      </button>
    </div>
    <div v-if="unavailable" class="availability-note">
      This item is currently unavailable and will be available soon. Stay tuned!
    </div>
  </article>
  <article
    v-else
    class="product-card"
    role="link"
    tabindex="0"
    @click="open"
    @keydown.enter.self="open"
  >
    <div class="product-thumb">
      <img
        :src="product.image_url"
        :alt="product.name"
        loading="lazy"
        decoding="async"
      />
      <div class="product-add-float">
        <button
          type="button"
          class="btn-add-float"
          :disabled="unavailable"
          @click.stop="addToCart(product)"
        >
          <i class="bi bi-bag"></i
          ><span>{{ unavailable ? "Coming Soon" : "Add to bag" }}</span>
        </button>
      </div>
    </div>
    <div class="product-info">
      <div class="product-info-row">
        <p>{{ product.name }}</p>
        <strong>JD {{ Number(product.price).toFixed(2) }}</strong>
      </div>
      <p class="product-cat product-summary">
        {{ product.subtitle || product.description }}
      </p>
    </div>
  </article>
</template>
<style scoped>
.availability-note {
  font-size: 11px;
  color: #d97706;
  margin-top: 8px;
  text-align: center;
  font-weight: 500;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.product-summary {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
  min-height: 3em;
}
</style>
