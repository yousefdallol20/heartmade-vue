<script setup>
import { useNavigation } from "../composables/navigation.js";
const { navigate } = useNavigation();
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { categories } from "../data/catalog.js";
import { products } from "../stores/shop.js";
import ProductCard from "../components/ProductCard.vue";
const route = useRoute(),
  router = useRouter();
const activeCategory = computed(() =>
  categories.includes(route.query.category) ? route.query.category : "All",
);
const searchQuery = ref(""),
  sortBy = ref("default");
const filteredProducts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const list = products.value.filter(
    (p) =>
      (activeCategory.value === "All" || p.category === activeCategory.value) &&
      (p.name + " " + p.category).toLowerCase().includes(q),
  );
  if (sortBy.value === "price-low") list.sort((a, b) => a.price - b.price);
  if (sortBy.value === "price-high") list.sort((a, b) => b.price - a.price);
  return list;
});
function setCategory(c) {
  router.replace({
    path: "/catalog",
    query: c === "All" ? {} : { category: c },
  });
}
function resetFilters() {
  searchQuery.value = "";
  sortBy.value = "default";
  setCategory("All");
}
</script>
<template>
  <main class="catalog-main">
    <div class="catalog-top">
      <button class="btn-back" @click="navigate('index.html')" type="button">
        <i class="bi bi-arrow-left"></i> Back to Home
      </button>
      <span class="catalog-tag">Store Catalog</span>
    </div>
    <div class="catalog-hero">
      <div>
        <h1>Explore All Creations</h1>
        <p>
          Browse our complete range of handmade crafts, ceramics, gift sets, and
          paper goods. Every purchase supports our Heart-Workers in Amman.
        </p>
      </div>
      <div class="catalog-count" v-if="products.length">
        <strong id="catalogCount">{{ filteredProducts.length }}</strong>
        <span style="color: var(--gray-warm); line-height: 1.2"
          >Unique items<br />in stock</span
        >
      </div>
    </div>
    <div v-if="!products.length" class="catalog-empty" role="status" dir="rtl">
      <i
        class="bi bi-bag-heart"
        style="font-size: 40px; color: var(--terracotta-2)"
      ></i>
      <h2 style="font-size: 22px; margin-top: 20px">
        No products have been added at this time.
      </h2>
    </div>
    <div class="control-bar" v-if="products.length">
      <div class="control-top-row">
        <div class="search-wrap">
          <i class="bi bi-search"></i>
          <input
            id="searchInput"
            placeholder="Search products or categories..."
            type="text"
            v-model="searchQuery"
          />
        </div>
        <div class="sort-wrap">
          <i class="bi bi-sliders"></i>
          <select id="sortSelect" v-model="sortBy">
            <option value="default">Sort: Default</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
      </div>
      <div class="filter-chips no-scrollbar" id="filterChips">
        <button
          :class="{ active: c === activeCategory }"
          :key="c"
          @click="setCategory(c)"
          class="filter-chip"
          v-for="c in categories"
        >
          {{ c }}
        </button>
      </div>
    </div>
    <div
      class="catalog-empty"
      id="catalogEmpty"
      v-if="products.length &amp;&amp; !filteredProducts.length &amp;&amp; activeCategory !== 'Soon'"
    >
      <i class="bi bi-bag" style="font-size: 48px; color: var(--border-3)"></i>
      <h3 class="font-serif-hero" style="font-size: 1.6rem; margin-top: 16px">
        No products found
      </h3>
      <p style="font-size: 13px; color: var(--gray-warm); margin-top: 4px">
        Try resetting your search query or selecting a different category.
      </p>
      <button
        class="btn-dark-pill"
        @click="resetFilters()"
        style="margin-top: 24px; padding: 10px 24px; font-size: 12px"
        type="button"
      >
        Reset Filters
      </button>
    </div>
    <div
      class="catalog-empty"
      id="categorySoon"
      v-if="products.length &amp;&amp; !filteredProducts.length &amp;&amp; activeCategory === 'Soon'"
    >
      <h3 class="font-serif-hero" style="font-size: 1.6rem">
        Our Heart Workers are working their magic! ✨
      </h3>
      <p style="font-size: 14px; color: var(--gray-warm); margin-top: 8px">
        New creations are on the way.
      </p>
      <p style="font-size: 14px; color: var(--gray-warm); margin-top: 4px">
        Come back soon to see what’s made from the heart. 🫶🏼
      </p>
    </div>
    <div class="catalog-grid" id="catalogGrid" v-if="filteredProducts.length">
      <ProductCard
        :key="p.id"
        :product="p"
        catalog=""
        v-for="p in filteredProducts"
      ></ProductCard>
    </div>
  </main>
</template>
<style scoped>
.control-bar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--surface-card, #fff);
  padding: 24px;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  margin-bottom: 30px;
}

.control-top-row {
  display: flex;
  gap: 16px;
  align-items: center;
  width: 100%;
}

.control-top-row .search-wrap,
.control-top-row .sort-wrap {
  display: flex;
  align-items: center;
  height: 52px;
  box-sizing: border-box;
  background: #fbf8f5;
  border: 1px solid var(--border-color, #e6e2de);
  border-radius: 12px;
  padding-block: 0;
  padding-inline: 16px;
}

.control-top-row .search-wrap {
  flex: 1;
  position: relative;
  gap: 12px;
}

.control-top-row .search-wrap i {
  position: static !important;
  transform: none !important;
  inset: auto !important;
  flex-shrink: 0;
  margin: 0 !important;
  font-size: 18px;
  line-height: 1;
  color: var(--gray-warm, #777);
}

.control-top-row .search-wrap input {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  padding: 0 !important;
  margin: 0;
  font-size: 15px;
  outline: none;
  box-shadow: none;
  color: var(--gray-dark, #333);
}

.control-top-row .sort-wrap {
  gap: 10px;
  min-width: 220px;
}

.control-top-row .sort-wrap i {
  position: static !important;
  flex-shrink: 0;
  margin: 0 !important;
  font-size: 18px;
  line-height: 1;
  color: var(--gray-warm, #777);
}

.control-top-row .sort-wrap select {
  border: none;
  background-color: transparent;
  width: 100%;
  height: 100%;
  padding: 0 !important;
  outline: none;
  box-shadow: none;
  font-size: 15px;
  cursor: pointer;
  color: var(--gray-dark, #333);
}

.filter-chips {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.filter-chips .filter-chip {
  flex-shrink: 0;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .control-top-row {
    flex-direction: column;
  }
  .control-top-row .sort-wrap {
    width: 100%;
  }
}
</style>
