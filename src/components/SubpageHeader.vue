<script setup>
import { useNavigation } from "../composables/navigation.js";
const { navigate } = useNavigation();
import { useRoute } from "vue-router";
import { cartCount, cartOpen } from "../stores/shop.js";
const route = useRoute();
</script>
<template>
  <header class="subpage-header">
    <div class="header-row">
      <button
        class="btn-back"
        @click="
          navigate(route.path === '/corporate' ? 'index.html' : 'catalog.html')
        "
        type="button"
      >
        <i class="bi bi-arrow-left"></i> Back to Store
      </button>
      <div class="subpage-actions">
        <button
          v-if="route.path === '/product'"
          type="button"
          class="subpage-cart-button"
          :aria-label="`Open shopping bag, ${cartCount} items`"
          @click="cartOpen = true"
        >
          <i class="bi bi-bag" aria-hidden="true"></i>
          <span v-if="cartCount > 0" class="subpage-cart-count">
            {{ cartCount }}
          </span>
        </button>

        <div class="brand-mini" @click="navigate('index.html')">
          <span class="heart-badge">
            <i class="bi bi-heart-fill" style="font-size: 15px"></i>
          </span>
          <span class="brand-text">Heart<br /><em>Made</em></span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.subpage-actions {
  display: flex;
  align-items: center;
  gap: 18px;
}

.subpage-cart-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: 1px solid #e4dbd3;
  border-radius: 50%;
  background: #fff;
  color: #2c2825;
  font-size: 20px;
  cursor: pointer;
}

.subpage-cart-button:focus-visible {
  outline: 2px solid #bd6c59;
  outline-offset: 3px;
}

.subpage-cart-count {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 20px;
  padding: 2px 5px;
  border-radius: 999px;
  background: #bd6c59;
  color: #fff;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
}

@media (max-width: 575px) {
  .subpage-actions {
    gap: 10px;
  }
}
</style>
