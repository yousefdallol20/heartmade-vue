<script setup>
import { watch, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import {
  cartOpen,
  cartItems,
  subtotal,
  updateQty,
  removeFromCart,
} from "../stores/shop.js";
const router = useRouter();
function close() {
  cartOpen.value = false;
}
function checkout() {
  close();
  router.push("/checkout");
}
function keydown(e) {
  if (e.key === "Escape") close();
}
watch(cartOpen, (open) => {
  document.body.style.overflow = open ? "hidden" : "";
  if (open) window.addEventListener("keydown", keydown);
  else window.removeEventListener("keydown", keydown);
});
onUnmounted(() => {
  document.body.style.overflow = "";
  window.removeEventListener("keydown", keydown);
});
</script>
<template>
  <div
    class="cart-overlay"
    :class="{ open: cartOpen }"
    :inert="!cartOpen"
    :aria-hidden="!cartOpen"
  >
    <div class="cart-backdrop" @click="close"></div>
    <div
      class="cart-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Your bag"
    >
      <div class="cart-panel-head">
        <h3 class="font-serif-hero">Your bag</h3>
        <button
          class="icon-btn"
          type="button"
          aria-label="Close bag"
          @click="close"
        >
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      <div class="cart-panel-body">
        <div v-if="!cartItems.length" class="cart-empty">
          <i class="bi bi-bag fs-1"></i>
          <p class="font-serif-hero mt-3">Your bag is empty</p>
          <p>Add something made with heart.</p>
        </div>
        <div v-for="item in cartItems" :key="item.product.id" class="cart-item">
          <img :src="item.product.image_url" :alt="item.product.name" />
          <div class="cart-item-info">
            <div>
              <p class="font-serif-hero item-name">{{ item.product.name }}</p>
              <p class="item-category">{{ item.product.category }}</p>
            </div>
            <div class="d-flex align-items-center justify-content-between mt-2">
              <div class="d-flex align-items-center gap-2">
                <button
                  class="qty-btn"
                  :aria-label="'Decrease ' + item.product.name"
                  @click="updateQty(item.product.id, -1)"
                >
                  <i class="bi bi-dash"></i></button
                ><span>{{ item.qty }}</span
                ><button
                  class="qty-btn"
                  :disabled="item.qty >= item.product.stock"
                  :aria-label="'Increase ' + item.product.name"
                  @click="updateQty(item.product.id, 1)"
                >
                  <i class="bi bi-plus"></i>
                </button>
              </div>
              <div class="d-flex align-items-center gap-2">
                <strong class="item-price"
                  >{{ (item.product.price * item.qty).toFixed(2) }} JD</strong
                ><button
                  class="icon-btn"
                  :aria-label="'Remove ' + item.product.name"
                  @click="removeFromCart(item.product.id)"
                >
                  <i class="bi bi-trash3"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="cartItems.length" class="cart-panel-foot">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <span>Total</span
          ><span class="font-serif-hero fs-4"
            >{{ subtotal.toFixed(2) }} JD</span
          >
        </div>
        <button type="button" class="btn-checkout" @click="checkout">
          Proceed to checkout <i class="bi bi-arrow-up-right"></i>
        </button>
      </div>
    </div>
  </div>
</template>
<style scoped>
.item-name {
  margin: 0;
  font-size: 15px;
  line-height: 1.2;
}
.item-category {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--gray-warm);
}
.item-price {
  font-size: 12px;
}
.cart-item-info span {
  font-size: 12px;
}
.qty-btn i {
  font-size: 10px;
}
</style>
