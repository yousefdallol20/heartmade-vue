<script setup>
import {
  ref,
  reactive,
  computed,
  onMounted,
  onUnmounted,
  watch,
} from "vue";

import { useRoute, useRouter } from "vue-router";
import { useNavigation } from "../composables/navigation.js";
import { jordanCities } from "../data/catalog.js";

import {
  cart,
  cartItems,
  subtotal,
  clearCart,
  loadStoreProducts,
  persist,
} from "../stores/shop.js";

import {
  backendRequest,
  initializeCsrf,
} from "../stores/auth.js";

const { navigate } = useNavigation();
const route = useRoute();
const router = useRouter();

const cityId = ref("amman");
const recap = ref(null);
const submitting = ref(false);
const catalogReady = ref(false);
const loadingProducts = ref(true);
const uncertain = ref(false);
const errorMessage = ref("");

const method = ref("cod");
const paypalConfig = ref(null);
const quote = ref(null);
const quoting = ref(false);
const activePayment = ref(null);
const recovering = ref(false);

const form = reactive({
  name: "",
  phone: "",
  email: "",
  streetAddress: "",
  apartmentNumber: "",
  buildingNumber: "",
});

const storageKey = "heartmade_paypal_checkout";

let savedCheckout = null;
let timer;
let quoteSequence = 0;
let alive = true;

try {
  const value = JSON.parse(
    sessionStorage.getItem(storageKey) || "null",
  );

  if (
    value &&
    typeof value.checkout_token === "string" &&
    value.payload
  ) {
    savedCheckout = value;
  }
} catch {
  savedCheckout = null;
}

const total = computed(() => subtotal.value);

const paypalAvailable = computed(
  () => paypalConfig.value?.available === true,
);

const terminal = computed(() =>
  [
    "cancelled",
    "expired",
    "failed",
    "refunded",
    "reversed",
  ].includes(activePayment.value?.status),
);

const canSubmit = computed(
  () =>
    catalogReady.value &&
    cartItems.value.length > 0 &&
    !submitting.value &&
    !uncertain.value &&
    !savedCheckout &&
    (
      method.value === "cod" ||
      (
        paypalAvailable.value &&
        quote.value &&
        !quoting.value &&
        quote.value.expires_at * 1000 > Date.now()
      )
    ),
);

const paymentDescription = computed(
  () =>
    ({
      creating: "Preparing your PayPal checkout.",

      awaiting_approval:
        "Your order is reserved. Continue to PayPal to approve the payment.",

      retry_required:
        "PayPal did not return a clear result. Retry this checkout without creating another order.",

      capturing:
        "Confirming your payment with PayPal.",

      pending:
        "PayPal is processing your payment. Your order will be confirmed after completion.",

      review_required:
        "Your payment needs verification. Contact the studio with this reference. Do not place another order.",

      cancelled:
        "Your payment was cancelled. Your bag has been kept.",

      expired:
        "The reservation expired without confirmed payment. Your bag has been kept.",

      failed:
        "PayPal declined the payment. Your bag has been kept.",
    })[activePayment.value?.status] ||
    "Checking your payment. Please keep this reference.",
);

function money(value) {
  return Number(value || 0).toFixed(2);
}

function saveCheckout() {
  // حفظ الجلسة قبل الإرسال يسمح باستعادة الطلب نفسه.
  sessionStorage.setItem(
    storageKey,
    JSON.stringify(savedCheckout),
  );
}

function forgetCheckout() {
  sessionStorage.removeItem(storageKey);
  savedCheckout = null;
}

function itemsSnapshot() {
  return cartItems.value.map(({ product, qty }) => ({
    product_id: Number(product.id),
    qty: Number(qty),
  }));
}

async function refreshQuote() {
  if (
    recap.value ||
    !alive ||
    method.value !== "paypal" ||
    !paypalAvailable.value ||
    savedCheckout ||
    !cartItems.value.length
  ) {
    return;
  }

  const sequence = ++quoteSequence;

  quoting.value = true;
  quote.value = null;

  try {
    await initializeCsrf();

    const result = await backendRequest(
      "/api/paypal/quote",
      {
        method: "POST",
        body: {
          items: itemsSnapshot(),
        },
      },
    );

    if (alive && sequence === quoteSequence) {
      quote.value = result.data;
    }
  } catch (error) {
    if (alive && sequence === quoteSequence) {
      errorMessage.value = error.message;
    }
  } finally {
    if (alive && sequence === quoteSequence) {
      quoting.value = false;
    }
  }
}

watch(
  [method, cart],
  () => {
    quoteSequence++;
    quote.value = null;
    quoting.value = false;

    if (method.value === "paypal") {
      refreshQuote();
    }
  },
  { deep: true },
);

function finish(receipt) {
  recap.value = receipt;

  if (savedCheckout) {
    // حذف الكميات المدفوعة مع إبقاء الإضافات الجديدة للسلة.
    const purchased = new Map(
      savedCheckout.payload.items.map((item) => [
        Number(item.product_id),
        Number(item.qty),
      ]),
    );

    const remaining = cart.value
      .map((item) => ({
        ...item,
        qty: Math.max(
          0,
          item.qty -
            (purchased.get(Number(item.id)) || 0),
        ),
      }))
      .filter((item) => item.qty > 0);

    cart.value = remaining;
    persist("heartmade_cart", remaining);
    forgetCheckout();
  } else {
    clearCart();
  }

  activePayment.value = null;
  uncertain.value = false;

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function applyPayment(payment) {
  if (
    !payment ||
    typeof payment.reference !== "string"
  ) {
    throw new Error(
      "Invalid payment response. Retry the same checkout.",
    );
  }

  activePayment.value = payment;

  savedCheckout.reference = payment.reference;
  saveCheckout();

  if (
    payment.status === "completed" &&
    payment.receipt?.payment_status === "paid"
  ) {
    finish(payment.receipt);
  }
}

function goToPayPal() {
  const href = activePayment.value?.approval_url;

  if (!href) {
    return;
  }

  const url = new URL(href);

  const expected =
    activePayment.value.environment === "sandbox"
      ? "www.sandbox.paypal.com"
      : "www.paypal.com";

  if (
    url.protocol !== "https:" ||
    url.hostname !== expected
  ) {
    errorMessage.value = "Invalid PayPal destination.";
    return;
  }

  window.location.assign(url.href);
}

async function recoverPayment(
  action = "status",
  redirect = false,
) {
  if (!savedCheckout || recovering.value) {
    return;
  }

  recovering.value = true;
  errorMessage.value = "";

  try {
    await initializeCsrf();

    if (!savedCheckout.reference) {
      const result = await backendRequest(
        "/api/paypal/orders",
        {
          method: "POST",
          body: savedCheckout.payload,
        },
      );

      applyPayment(result.data);
    } else {
      const reference = encodeURIComponent(
        savedCheckout.reference,
      );

      const result = await backendRequest(
        `/api/paypal/payments/${reference}/${action}`,
        {
          method: "POST",
          body: {
            checkout_token:
              savedCheckout.checkout_token,
          },
        },
      );

      applyPayment(result.data);
    }

    if (
      redirect &&
      activePayment.value?.status === "awaiting_approval"
    ) {
      goToPayPal();
    }
  } catch (error) {
    errorMessage.value =
      error.message ||
      "Could not verify your payment. Retry this checkout.";

    if (
      !savedCheckout.reference &&
      [400, 403, 422].includes(Number(error.status))
    ) {
      forgetCheckout();
      uncertain.value = false;

      await loadStoreProducts().catch(() => {});
      await refreshQuote();
    }
  } finally {
    recovering.value = false;
  }
}

async function restartCheckout() {
  if (!terminal.value || recovering.value) {
    return;
  }

  forgetCheckout();
  activePayment.value = null;
  uncertain.value = false;
  errorMessage.value = "";

  await loadStoreProducts().catch(() => {});
  await refreshQuote();
}

async function placeOrder() {
  if (!canSubmit.value) {
    return;
  }

  errorMessage.value = "";

  if (
    ![
      form.name,
      form.phone,
      form.email,
      form.streetAddress,
      form.apartmentNumber,
      form.buildingNumber,
    ].every((value) => value.trim())
  ) {
    errorMessage.value =
      "Please complete all delivery information.";
    return;
  }

  if (cartItems.value.length !== cart.value.length) {
    errorMessage.value =
      "Some items are unavailable. Review your bag before ordering.";
    return;
  }

  const items = itemsSnapshot();

  if (
    items.some(
      (item) =>
        !Number.isInteger(item.product_id) ||
        item.product_id < 1 ||
        !Number.isInteger(item.qty) ||
        item.qty < 1 ||
        item.qty > 100,
    )
  ) {
    errorMessage.value =
      "Choose valid products and quantities between 1 and 100.";
    return;
  }

  const payload = {
    customer_name: form.name.trim(),
    customer_phone: form.phone.trim(),
    customer_email: form.email.trim(),

    street_address: form.streetAddress.trim(),
    apartment_number: form.apartmentNumber.trim(),
    building_number: form.buildingNumber.trim(),

    shipping_address: [
      form.streetAddress.trim(),
      "Building " + form.buildingNumber.trim(),
      "Apartment " + form.apartmentNumber.trim(),
    ].join(", "),

    city: cityId.value,

    payment_method:
      method.value === "paypal"
        ? "PayPal"
        : "Cash on Delivery",

    expected_total:
      method.value === "paypal"
        ? quote.value.order_amount
        : money(total.value),

    items,
  };

  if (method.value === "paypal") {
    const token = crypto.randomUUID();

    savedCheckout = {
      checkout_token: token,
      payload: {
        ...payload,
        quote_token: quote.value.quote_token,
        checkout_token: token,
      },
    };

    try {
      saveCheckout();
    } catch {
      savedCheckout = null;

      errorMessage.value =
        "Enable session storage in your browser before paying with PayPal.";

      return;
    }

    submitting.value = true;
    uncertain.value = true;

    try {
      await recoverPayment("status", true);
    } finally {
      submitting.value = false;
    }

    return;
  }

  submitting.value = true;

  let started = false;

  try {
    await initializeCsrf();

    started = true;

    const result = await backendRequest(
      "/api/orders",
      {
        method: "POST",
        body: payload,
      },
    );

    const receipt = result.data;

    if (
      result.success !== true ||
      !Number.isInteger(receipt?.id) ||
      !Array.isArray(receipt.items)
    ) {
      throw new Error("Invalid order confirmation.");
    }

    finish(receipt);
  } catch (error) {
    const status = Number(error.status || 0);

    if (
      started &&
      (
        status === 0 ||
        status >= 500 ||
        status < 400
      )
    ) {
      uncertain.value = true;

      errorMessage.value =
        "We could not confirm your order. Contact the studio before submitting again.";
    } else {
      errorMessage.value =
        error.message || "Could not place your order.";

      if (status === 422) {
        await loadStoreProducts().catch(() => {
          catalogReady.value = false;
        });
      }
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await Promise.allSettled([
    (async () => {
      try {
        await loadStoreProducts();
        catalogReady.value = true;
      } catch (error) {
        errorMessage.value = error.message;
      } finally {
        loadingProducts.value = false;
      }
    })(),

    (async () => {
      try {
        paypalConfig.value = await backendRequest(
          "/api/paypal/configuration",
        );
      } catch {
        paypalConfig.value = {
          available: false,
        };
      }
    })(),
  ]);

  if (savedCheckout) {
    method.value = "paypal";
    uncertain.value = true;

    await recoverPayment(
      route.query.paypal === "cancelled"
        ? "cancel"
        : route.query.paypal === "returned"
          ? "capture"
          : "status",
    );
  } else if (route.query.paypal) {
    errorMessage.value =
      "This browser has no saved checkout session. Contact the studio if you completed a payment.";
  }

  if (route.query.paypal) {
    await router.replace({
      path: "/checkout",
      query: {},
    });
  }

  timer = window.setInterval(() => {
    if (
      savedCheckout &&
      !terminal.value &&
      !recovering.value
    ) {
      recoverPayment("capture");
    } else if (
      method.value === "paypal" &&
      quote.value &&
      quote.value.expires_at * 1000 <= Date.now()
    ) {
      refreshQuote();
    }
  }, 15000);
});

onUnmounted(() => {
  alive = false;
  quoteSequence++;
  window.clearInterval(timer);
});
</script>

<template>
  <div class="checkout-wrap">
    <div class="checkout-top">
      <button
        class="btn-back"
        :disabled="submitting"
        style="background: #fff; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05)"
        type="button"
        @click="navigate('index.html')"
      >
        <i class="bi bi-arrow-left"></i>
        Back to Store
      </button>

      <div class="brand-mini">
        <span
          class="heart-badge"
          style="width: 32px; height: 32px; font-weight: 700; font-size: 14px"
        >
          ♥
        </span>

        <span class="brand-text icon-size-16">
          Heart<br /><em>Made</em>
        </span>
      </div>
    </div>

    <div
      v-if="recap"
      id="orderSuccess"
      class="order-success-card"
      aria-live="polite"
    >
      <div class="check-circle">
        <i
          class="bi bi-check-circle"
          style="font-size: 32px"
        ></i>
      </div>

      <h2>
        {{
          recap.payment_status === "paid"
            ? "Payment complete. Thank you!"
            : "Your order has been received!"
        }}
      </h2>

      <p>
        Thank you for supporting Heart Made. Our team will review your order
        and arrange delivery.
      </p>

      <div class="order-recap">
        <div class="row">
          <span>Order Reference:</span>
          <strong>{{ recap.reference }}</strong>
        </div>

        <div class="row">
          <span>Order Status:</span>
          <strong>Pending</strong>
        </div>

        <div class="row">
          <span>Payment Method:</span>
          <strong>{{ recap.payment_method }}</strong>
        </div>

        <div class="row">
          <span>Payment Status:</span>

          <strong
            :class="
              recap.payment_status === 'paid'
                ? 'payment-paid'
                : 'payment-pending'
            "
          >
            {{
              recap.payment_status === "paid"
                ? "Paid"
                : "Awaiting payment"
            }}
          </strong>
        </div>

        <div class="row">
          <span>Customer:</span>
          <strong>{{ recap.customer_name }}</strong>
        </div>

        <div class="row">
          <span>Delivery Address:</span>
          <strong>{{ recap.shipping_address }}</strong>
        </div>

        <div class="row">
          <span>Total Amount:</span>

          <strong style="color: #bd6c59">
            JD {{ money(recap.total) }}
          </strong>
        </div>
      </div>

      <div class="receipt-items">
        <div
          v-for="item in recap.items"
          :key="item.product_id"
          class="receipt-item"
        >
          <span>{{ item.qty }} × {{ item.name }}</span>

          <strong>
            JD {{ money(Number(item.price) * item.qty) }}
          </strong>
        </div>
      </div>

      <p class="payment-note">
        {{
          recap.payment_status === "paid"
            ? "Your PayPal payment has been verified. Our team will review your order and arrange delivery."
            : "Please pay the total amount when your order is delivered."
        }}
      </p>

      <button
        class="btn-dark-pill"
        style="width: 100%; margin-top: 24px"
        type="button"
        @click="navigate('index.html')"
      >
        Return to Store
      </button>
    </div>

    <div
      v-else-if="activePayment || (uncertain && savedCheckout)"
      class="payment-status-card"
      aria-live="polite"
    >
      <span class="checkout-eyebrow">
        PAYPAL CHECKOUT
      </span>

      <h2>
        {{
          terminal
            ? "Payment not completed"
            : "Your payment status"
        }}
      </h2>

      <p>{{ paymentDescription }}</p>

      <p v-if="activePayment">
        <strong>Reference:</strong>
        {{ activePayment.reference }}
      </p>

      <p v-if="activePayment">
        <strong>Order total:</strong>
        JD {{ money(activePayment.order_amount) }}
      </p>

      <div
        v-if="errorMessage"
        class="checkout-error"
        role="alert"
      >
        {{ errorMessage }}
      </div>

      <div class="payment-actions">
        <button
          v-if="
            activePayment?.approval_url &&
            activePayment.status === 'awaiting_approval'
          "
          type="button"
          class="btn-place-order paypal-button"
          @click="goToPayPal"
        >
          Continue to PayPal
        </button>

        <button
          v-if="!terminal"
          type="button"
          class="btn btn-outline-dark rounded-pill"
          :disabled="recovering"
          @click="recoverPayment('capture')"
        >
          {{
            recovering
              ? "Checking payment..."
              : "Check payment / retry"
          }}
        </button>

        <button
          v-if="!terminal"
          type="button"
          class="btn btn-outline-secondary rounded-pill"
          :disabled="recovering"
          @click="recoverPayment('cancel')"
        >
          Cancel unpaid checkout
        </button>

        <button
          v-if="terminal"
          type="button"
          class="btn-place-order"
          @click="restartCheckout"
        >
          Return to checkout
        </button>
      </div>
    </div>

    <div
      v-else
      id="checkoutGrid"
      class="checkout-grid"
    >
      <div class="checkout-form-card">
        <div class="checkout-form-head">
          <i
            class="bi bi-truck"
            style="color: #bd6c59; font-size: 22px"
          ></i>

          <h2>Delivery Information</h2>
        </div>

        <div
          v-if="errorMessage"
          class="checkout-error"
          role="alert"
        >
          {{ errorMessage }}
        </div>

        <form
          id="checkoutForm"
          @submit.prevent="placeOrder"
        >
          <fieldset :disabled="submitting || uncertain">
            <div class="form-group">
              <label
                for="fullName"
                class="form-label"
              >
                FULL NAME *
              </label>

              <input
                id="fullName"
                v-model="form.name"
                class="form-control-custom"
                placeholder="Enter your full name"
                autocomplete="name"
                maxlength="255"
                required
                type="text"
              />
            </div>

            <div class="form-group">
              <label
                for="customerEmail"
                class="form-label"
              >
                EMAIL ADDRESS *
              </label>

              <input
                id="customerEmail"
                v-model="form.email"
                class="form-control-custom"
                placeholder="you@example.com"
                autocomplete="email"
                maxlength="255"
                required
                type="email"
              />
            </div>

            <div class="form-row2">
              <div class="form-group margin-bottom-none">
                <label
                  for="phoneNumber"
                  class="form-label"
                >
                  PHONE NUMBER *
                </label>

                <input
                  id="phoneNumber"
                  v-model="form.phone"
                  class="form-control-custom"
                  placeholder="+962 7X XXX XXXX"
                  autocomplete="tel"
                  maxlength="40"
                  required
                  type="tel"
                />
              </div>

              <div class="form-group margin-bottom-none">
                <label
                  for="citySelect"
                  class="form-label"
                >
                  CITY *
                </label>

                <div class="select-wrap">
                  <select
                    id="citySelect"
                    v-model="cityId"
                    class="form-control-custom"
                    required
                  >
                    <option
                      v-for="item in jordanCities"
                      :key="item.id"
                      :value="item.id"
                    >
                      {{ item.name }}
                    </option>
                  </select>

                  <i class="bi bi-chevron-down"></i>
                </div>
              </div>
            </div>

            <!-- خانات عنوان التوصيل المنفصلة -->
            <div class="delivery-address-fields margin-top-20">
              <div class="form-group">
                <label
                  for="streetAddress"
                  class="form-label"
                >
                  STREET ADDRESS *
                </label>

                <input
                  id="streetAddress"
                  v-model="form.streetAddress"
                  name="street_address"
                  class="form-control-custom"
                  placeholder="Enter your street address"
                  autocomplete="address-line1"
                  maxlength="1000"
                  required
                  type="text"
                />
              </div>

              <div class="address-number-row">
                <div class="form-group">
                  <label
                    for="apartmentNumber"
                    class="form-label"
                  >
                    APARTMENT NUMBER *
                  </label>

                  <input
                    id="apartmentNumber"
                    v-model="form.apartmentNumber"
                    name="apartment_number"
                    class="form-control-custom"
                    placeholder="e.g. 4 or 4A"
                    autocomplete="address-line2"
                    maxlength="50"
                    required
                    type="text"
                  />
                </div>

                <div class="form-group">
                  <label
                    for="buildingNumber"
                    class="form-label"
                  >
                    BUILDING NUMBER *
                  </label>

                  <input
                    id="buildingNumber"
                    v-model="form.buildingNumber"
                    name="building_number"
                    class="form-control-custom"
                    placeholder="e.g. 12 or 12B"
                    autocomplete="off"
                    maxlength="50"
                    required
                    type="text"
                  />
                </div>
              </div>
            </div>

            <div class="form-group">
              <p class="form-label margin-bottom-12">
                PAYMENT METHOD *
              </p>

              <div class="pay-options">
                <label
                  id="payCod"
                  class="pay-option"
                  :class="{ selected: method === 'cod' }"
                >
                  <input
                    v-model="method"
                    class="visually-hidden"
                    type="radio"
                    name="payment-method"
                    value="cod"
                  />

                  <div class="pay-option-left">
                    <div
                      class="pay-radio"
                      :class="{ checked: method === 'cod' }"
                    >
                      <div class="dot"></div>
                    </div>

                    <div>
                      <p class="title">Cash on Delivery</p>
                      <p class="sub">
                        Pay when your order arrives
                      </p>
                    </div>
                  </div>

                  <i
                    class="bi bi-cash-coin"
                    style="color: #bd6c59; font-size: 20px"
                  ></i>
                </label>

                <label
                  id="payPaypal"
                  class="pay-option paypal"
                  :class="{
                    selected: method === 'paypal',
                    'paypal-unavailable': !paypalAvailable,
                  }"
                >
                  <input
                    v-model="method"
                    class="visually-hidden"
                    type="radio"
                    name="payment-method"
                    value="paypal"
                    :disabled="!paypalAvailable"
                  />

                  <div class="pay-option-left">
                    <div
                      class="pay-radio paypal"
                      :class="{
                        checked: method === 'paypal',
                      }"
                    >
                      <div class="dot"></div>
                    </div>

                    <div>
                      <p class="title">PayPal</p>

                      <p class="sub">
                        {{
                          paypalAvailable
                            ? "Pay securely through PayPal"
                            : paypalConfig
                              ? "Temporarily unavailable"
                              : "Checking availability..."
                        }}
                      </p>
                    </div>
                  </div>

                  <span class="paypal-wordmark">
                    PayPal
                  </span>
                </label>
              </div>
            </div>

            <div style="padding-top: 16px">
              <button
                id="placeOrderBtn"
                :disabled="!canSubmit"
                class="btn-place-order"
                type="submit"
              >
                <span>
                  {{
                    submitting
                      ? "Placing your order..."
                      : loadingProducts
                        ? "Loading products..."
                        : method === "paypal"
                          ? "Continue to PayPal"
                          : "Place Order"
                  }}
                </span>

                <i
                  class="bi bi-send"
                  aria-hidden="true"
                ></i>
              </button>
            </div>
          </fieldset>
        </form>
      </div>

      <div class="order-summary-card">
        <div class="order-summary-head">
          <i
            class="bi bi-bag"
            style="color: #bd6c59; font-size: 18px"
          ></i>

          <h3>Order Summary</h3>
        </div>

        <div
          id="summaryItems"
          style="max-height: 320px; overflow-y: auto"
        >
          <p
            v-if="!cartItems.length"
            class="text-center text-muted py-4"
          >
            {{
              loadingProducts
                ? "Loading products..."
                : "No items selected."
            }}
          </p>

          <div
            v-for="item in cartItems"
            :key="item.product.id"
            class="summary-item"
          >
            <div class="d-flex align-items-center gap-3">
              <img
                :alt="item.product.name"
                :src="item.product.image_url"
              />

              <div class="summary-item-info">
                <h4>{{ item.product.name }}</h4>

                <p>
                  Qty: {{ item.qty }} × JD
                  {{ money(item.product.price) }}
                </p>
              </div>
            </div>

            <span class="summary-item-price">
              JD
              {{
                money(
                  Number(item.product.price) * item.qty,
                )
              }}
            </span>
          </div>
        </div>

        <p class="free-delivery-note">
          <i
            class="bi bi-truck"
            aria-hidden="true"
          ></i>

          Free delivery across Jordan
        </p>

        <div class="summary-total-final">
          <span>Total Amount</span>
          <span class="amount">
            JD {{ money(total) }}
          </span>
        </div>

        <div
          v-if="method === 'paypal'"
          class="paypal-checkout-note"
          aria-live="polite"
        >
          <p v-if="quoting">
            Preparing PayPal checkout...
          </p>

          <button
            v-else-if="!quote"
            type="button"
            class="paypal-quote-refresh"
            :disabled="!paypalAvailable"
            @click="refreshQuote"
          >
            Retry PayPal checkout
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.delivery-address-fields,
.delivery-address-fields .form-group {
  min-width: 0;
}

.address-number-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.delivery-address-fields .form-control-custom {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

@media (max-width: 575.98px) {
  .address-number-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
}

fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.checkout-error {
  margin-bottom: 20px;
  padding: 12px 16px;
  border: 1px solid #e6b8af;
  border-radius: 12px;
  background: #fff2ee;
  color: #923e30;
  font-size: 13px;
  line-height: 1.6;
}

.paypal-unavailable {
  opacity: 0.55;
  cursor: not-allowed;
}

.paypal-wordmark {
  color: #003087;
  font-size: 12px;
  font-weight: 700;
  font-style: italic;
}

.btn-place-order:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.payment-pending {
  color: #916419;
}

.receipt-items {
  margin-top: 20px;
  border-top: 1px solid #e8dfd7;
}

.receipt-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #e8dfd7;
  font-size: 13px;
}

.receipt-item strong {
  flex-shrink: 0;
}

.payment-note {
  margin-top: 20px;
  color: #786e68;
  font-size: 13px;
}

.order-recap strong {
  overflow-wrap: anywhere;
}

.pay-option {
  cursor: pointer;
  margin: 0;
}

.pay-option:focus-within {
  outline: 3px solid #9aaee5;
  outline-offset: 3px;
}

.paypal-button {
  background: #003087;
}

.paypal-checkout-note {
  margin-top: 12px;
  color: #786e68;
  font-size: 11px;
  line-height: 1.6;
}

.paypal-checkout-note p {
  margin: 0;
}

.paypal-quote-refresh {
  padding: 0;
  border: 0;
  background: transparent;
  color: #786e68;
  font: inherit;
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;
}

.paypal-quote-refresh:disabled {
  opacity: 0.5;
  cursor: default;
}

.free-delivery-note {
  margin-top: 18px;
  color: #648272;
  font-size: 13px;
}

.payment-status-card {
  max-width: 760px;
  margin: 40px auto;
  padding: clamp(24px, 5vw, 48px);
  border: 1px solid #e8dfd7;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 12px 40px #263b320a;
}

.payment-status-card h2 {
  margin: 16px 0;
  font-family: "Instrument Serif", Georgia, serif;
  font-size: 36px;
}

.payment-status-card p {
  overflow-wrap: anywhere;
  color: #786e68;
  line-height: 1.7;
}

.checkout-eyebrow {
  color: #003087;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.payment-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.payment-actions .btn-place-order {
  width: auto;
  padding: 14px 24px;
}

.payment-paid {
  color: #648272;
}
</style>