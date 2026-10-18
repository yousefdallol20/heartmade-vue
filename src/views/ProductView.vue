<script setup>
import { computed, ref, watch, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { useNavigation } from "../composables/navigation.js";
import { products, addToCart } from "../stores/shop.js";
import { backendRequest } from "../stores/auth.js";

const { navigate } = useNavigation();
const route = useRoute();
const loadedProduct = ref(null);
const productLoading = ref(false);
const productError = ref("");
let productRequestVersion = 0;

const product = computed(() => loadedProduct.value);
const includedItems = computed(() =>
  String(product.value?.whats_included || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean),
);
const productImages = computed(() => {
  const item = product.value;
  if (!item) return [];
  return [
    ...new Set(
      [
        ...(Array.isArray(item.images) ? item.images : []),
        item.image_url,
      ].filter(Boolean),
    ),
  ];
});
const quantity = ref(1);
const mainSrc = ref("");
const detailsOpen = ref(false);
const shippingOpen = ref(false);
const isSoonProduct = computed(
  () => product.value?.category === "Soon" || Number(product.value?.stock) <= 0,
);

async function loadProduct(id) {
  const requestVersion = ++productRequestVersion;
  loadedProduct.value = null;
  productError.value = "";
  productLoading.value = true;
  quantity.value = 1;
  mainSrc.value = "";
  detailsOpen.value = false;
  shippingOpen.value = false;

  if (!/^\d+$/.test(String(id ?? "")) || Number(id) < 1) {
    productError.value = "Product not found.";
    productLoading.value = false;
    return;
  }

  try {
    const result = await backendRequest(
      `/api/products/${encodeURIComponent(id)}`,
    );
    if (!result.data || Number(result.data.id) !== Number(id)) {
      throw new Error("Invalid product response.");
    }
    if (requestVersion !== productRequestVersion) return;
    loadedProduct.value = result.data;
    mainSrc.value = productImages.value[0] || "";
    document.title = result.data.name + " — Heart Made Zone";
    const exists = products.value.some(
      (item) => Number(item.id) === Number(id),
    );
    products.value = exists
      ? products.value.map((item) =>
          Number(item.id) === Number(id) ? result.data : item,
        )
      : [...products.value, result.data];
  } catch (error) {
    if (requestVersion !== productRequestVersion) return;
    productError.value =
      error.status === 404
        ? "Product not found."
        : error.message || "Could not load this product.";
  } finally {
    if (requestVersion === productRequestVersion) productLoading.value = false;
  }
}
watch(
  () => route.query.id,
  (id) => {
    void loadProduct(id);
  },
  { immediate: true },
);
onUnmounted(() => {
  productRequestVersion += 1;
});

function changeQty(delta) {
  if (!product.value || isSoonProduct.value) return;
  quantity.value = Math.min(
    Number(product.value.stock),
    Math.max(1, quantity.value + delta),
  );
}
function handleAddToCart() {
  if (product.value && !isSoonProduct.value)
    addToCart(product.value, quantity.value);
}
</script>
<template>
  <main class="product-main">
    <div v-if="product" class="pd-grid">
      <div class="pd-image">
        <div class="pd-gallery-container" dir="ltr">
          <div class="pd-thumbs-column">
            <button
              v-for="(img, i) in productImages"
              :key="i"
              class="pd-thumb-box"
              @click="mainSrc = img"
              :aria-label="'View product image ' + (i + 1)"
            >
              <img :src="img" :alt="product.name + ' - ' + (i + 1)" />
            </button>
          </div>
          <div class="pd-main-image-box">
            <img id="mainProductImg" :src="mainSrc" :alt="product.name" />
            <div class="pd-cat-badge">
              {{ product.category }}
              <span v-if="isSoonProduct" class="soon-tag">Soon</span>
            </div>
          </div>
        </div>
      </div>
      <div class="pd-info">
        <div>
          <div class="pd-creator">
            <i class="bi bi-stars"></i> Created by
            {{ product.creator || "CLAY STUDIO" }}
          </div>
          <h1>{{ product.name }}</h1>
          <div
            style="font-size: 13px; color: var(--gray-warm); margin-bottom: 8px"
          >
            Belongs to category:
            <strong style="color: var(--dark)">{{ product.category }}</strong>
            <span v-if="isSoonProduct" class="soon-tag">Soon</span>
          </div>
          <div class="pd-price-row">
            <span class="pd-price"
              >JD {{ Number(product.price).toFixed(2) }}</span
            >
          </div>
        </div>

        <hr class="pd-divider" />

        <div>
          <h3 class="pd-section-title">Description</h3>
          <p class="pd-desc">
            {{
              product.description ||
              "Handcrafted with love, patience, and creative dedication by our talented Heart-Workers in Amman. Each piece carries a unique human story."
            }}
          </p>
        </div>

        <div class="pd-story-box">
          <div class="story-title">
            <i class="bi bi-heart-fill"></i><span>The Story</span>
          </div>
          <p>
            {{
              product.story ||
              "Crafted with care by talented hands in our Amman workshop. Each piece represents hours of dedicated craftsmanship, skill building, and creative expression."
            }}
          </p>
        </div>

        <template v-if="!isSoonProduct">
          <div class="pd-qty-row">
            <span class="label">Quantity</span>
            <div class="pd-qty-control">
              <button type="button" @click="changeQty(-1)">
                <i class="bi bi-dash"></i>
              </button>
              <span>{{ quantity }}</span>
              <button type="button" @click="changeQty(1)">
                <i class="bi bi-plus"></i>
              </button>
            </div>
          </div>
        </template>

        <template v-if="isSoonProduct">
          <button
            type="button"
            class="pd-add-btn"
            disabled
            style="
              opacity: 0.6;
              cursor: not-allowed;
              background: var(--gray-warm, #777);
            "
          >
            <i class="bi bi-clock-history"></i>
            <span>Coming Soon</span>
          </button>
          <div
            style="
              font-size: 12px;
              color: #d97706;
              margin-top: 10px;
              font-weight: 500;
              text-align: center;
            "
          >
            This item is currently unavailable and will be available soon. Stay
            tuned!
          </div> </template
        ><template v-else>
          <button type="button" class="pd-add-btn" @click="handleAddToCart()">
            <i class="bi bi-bag"></i>
            <span id="addBtnLabel"
              >Add {{ quantity }} to Bag • JD
              {{ (product.price * quantity).toFixed(2) }}</span
            >
          </button>
        </template>

        <div
          class="accordion-item"
          style="
            border: 1px solid var(--border-color, #e5e0dc);
            border-radius: 8px;
            margin-top: 20px;
            margin-bottom: 12px;
            overflow: hidden;
          "
        >
          <div
            class="accordion-header"
            role="button"
            tabindex="0"
            :aria-expanded="detailsOpen"
            @keydown.enter="detailsOpen = !detailsOpen"
            @keydown.space.prevent="detailsOpen = !detailsOpen"
            @click="detailsOpen = !detailsOpen"
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 14px 16px;
              background: #fff;
              cursor: pointer;
            "
          >
            <div
              style="
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 600;
                font-size: 14px;
              "
            >
              <i class="bi bi-paperclip icon-size-16"></i> Details &amp;
              Dimensions
            </div>
            <i
              id="detailsIcon"
              :style="{ transform: detailsOpen ? 'rotate(180deg)' : '' }"
              class="bi bi-chevron-down"
              style="transition: transform 0.3s"
            ></i>
          </div>
          <div
            v-show="detailsOpen"
            id="detailsBody"
            style="
              padding: 16px;
              background: #faf8f6;
              border-top: 1px solid var(--border-color, #e5e0dc);
              font-size: 13px;
              color: var(--gray-warm, #555);
            "
          >
            <div class="margin-bottom-12">
              <strong
                style="
                  color: var(--dark, #222);
                  display: block;
                  margin-bottom: 4px;
                "
                >Dimensions</strong
              >
              <span style="white-space: pre-line; overflow-wrap: anywhere">{{
                product.dimensions ||
                "Dimensions are not provided for this item."
              }}</span>
            </div>
            <div>
              <strong
                style="
                  color: var(--dark, #222);
                  display: block;
                  margin-bottom: 4px;
                "
                >What's Included</strong
              >
              <ul v-if="includedItems.length" class="pd-list-indent">
                <li
                  v-for="(item, index) in includedItems"
                  :key="index"
                  style="overflow-wrap: anywhere"
                >
                  {{ item }}
                </li>
              </ul>
              <p v-else class="mb-0">
                Included items are not provided for this product.
              </p>
            </div>
          </div>
        </div>

        <div
          class="accordion-item"
          style="
            border: 1px solid var(--border-color, #e5e0dc);
            border-radius: 8px;
            overflow: hidden;
          "
        >
          <div
            class="accordion-header"
            role="button"
            tabindex="0"
            :aria-expanded="shippingOpen"
            @keydown.enter="shippingOpen = !shippingOpen"
            @keydown.space.prevent="shippingOpen = !shippingOpen"
            @click="shippingOpen = !shippingOpen"
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 14px 16px;
              background: #fff;
              cursor: pointer;
            "
          >
            <div
              style="
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 600;
                font-size: 14px;
              "
            >
              <i class="bi bi-truck icon-size-16"></i> Shipping &amp; Delivery
            </div>
            <i
              id="shippingIcon"
              :style="{ transform: shippingOpen ? 'rotate(180deg)' : '' }"
              class="bi bi-chevron-down"
              style="transition: transform 0.3s"
            ></i>
          </div>
          <div
            v-show="shippingOpen"
            id="shippingBody"
            style="
              padding: 16px;
              background: #faf8f6;
              border-top: 1px solid var(--border-color, #e5e0dc);
              font-size: 13px;
              color: var(--gray-warm, #555);
            "
          >
            <p class="margin-bottom-12">
              Delivery within Amman and across Jordan is available. Delivery
              charges and timing are confirmed before payment. International
              delivery is available by quotation.
            </p>
            <div
              style="
                background: #f3eeeb;
                padding: 10px 12px;
                border-radius: 6px;
                font-size: 12px;
              "
            >
              <strong
                style="
                  color: var(--dark, #222);
                  display: block;
                  margin-bottom: 2px;
                "
                >Delivery confirmation</strong
              >
              Final delivery availability, price, and estimated timing are
              confirmed with your order.
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      v-else
      class="text-center py-5"
      :role="productLoading ? 'status' : undefined"
    >
      <h1>
        {{ productLoading ? "Loading product..." : "Product unavailable" }}
      </h1>
      <p v-if="productError" class="text-muted" role="alert">
        {{ productError }}
      </p>
      <button
        v-if="!productLoading && productError !== 'Product not found.'"
        class="btn-dark-pill me-2"
        type="button"
        @click="loadProduct(route.query.id)"
      >
        Try again
      </button>
      <button class="btn-dark-pill" @click="navigate('catalog.html')">
        Back to Store
      </button>
    </div>
  </main>
</template>
