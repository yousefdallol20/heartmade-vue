import { ref, computed } from "vue";
import { fallbackProducts } from "../data/catalog.js";
import { backendRequest } from "./auth.js";

export const notice = ref("");
export const cartOpen = ref(false);

let noticeTimer;

export function showNotice(message) {
  // عدم عرض تفاصيل تقنية في التنبيهات العامة.
  const text =
    typeof message === "string"
      ? message.trim()
      : "";

  const technical =
    /SQLSTATE|PDOException|stack\s*trace|cURL\s*error|Illuminate\\|Symfony\\|vendor[\\/]|\.php\s*[:(]\s*\d|<\/?(?:html|body|script)\b/i;

  notice.value =
    !text || technical.test(text)
      ? "Something went wrong. Please try again later."
      : text.length > 180
        ? text.slice(0, 177).trimEnd() + "..."
        : text;

  clearTimeout(noticeTimer);

  noticeTimer = setTimeout(() => {
    notice.value = "";
  }, 3000);
}

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);

    return raw === null
      ? fallback
      : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function persist(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value),
    );

    return true;
  } catch {
    showNotice(
      "Unable to save your changes on this device. Please allow site storage and try again.",
    );

    return false;
  }
}

function loadArray(key, fallback, valid) {
  const value = load(key, fallback);

  return Array.isArray(value)
    ? value.filter(valid)
    : fallback;
}

export const products = ref(
  loadArray(
    "hm_products",
    fallbackProducts,
    (product) =>
      product &&
      Number.isInteger(product.id) &&
      product.id > 0 &&
      typeof product.name === "string" &&
      Number.isFinite(Number(product.price)) &&
      Number(product.price) >= 0,
  ),
);

// قبول أرقام Laravel مع دعم المعرّفات النصية القديمة.
export const orders = ref(
  loadArray(
    "hm_orders",
    [],
    (order) =>
      order &&
      (
        (
          Number.isInteger(order.id) &&
          order.id > 0
        ) ||
        typeof order.id === "string"
      ) &&
      Array.isArray(order.items) &&
      Number.isFinite(Number(order.total)),
  ),
);

export const inquiries = ref(
  loadArray(
    "hm_inquiries",
    [],
    (inquiry) =>
      inquiry &&
      typeof inquiry.id === "string",
  ),
);

export const cart = ref(
  loadArray(
    "heartmade_cart",
    [],
    (item) =>
      item &&
      Number.isInteger(item.qty) &&
      item.qty > 0,
  )
    .map((item) => ({
      id: item.id || item.product?.id,
      qty: item.qty,
    }))
    .filter((item) =>
      products.value.some(
        (product) => product.id === item.id,
      ),
    ),
);

const defaultSettings = {
  settingName: "Heart Made Zone",
  settingEmail: "hello@heartmadezone.com",
  settingLocation: "Amman, Jordan",
  settingInstagram:
    "https://www.instagram.com/heartmade.zone/",
  settingFacebook:
    "https://www.facebook.com/heartmade.zone",
};

const savedSettings = load(
  "hm_settings",
  defaultSettings,
);

export const settings = ref({
  ...defaultSettings,
  ...(
    savedSettings &&
    typeof savedSettings === "object" &&
    !Array.isArray(savedSettings)
      ? savedSettings
      : {}
  ),
});

export const partners = ref([]);

export const cartItems = computed(() =>
  cart.value.flatMap((item) => {
    const product = products.value.find(
      (product) => product.id === item.id,
    );

    return (
      product &&
      product.category !== "Soon" &&
      Number(product.stock) > 0
    )
      ? [
          {
            product,
            qty: Math.min(
              item.qty,
              Number(product.stock),
            ),
          },
        ]
      : [];
  }),
);

// عدد المنتجات المختلفة، وليس مجموع الكميات.
export const cartCount = computed(
  () => cartItems.value.length,
);

// جمع الأسعار بأجزاء الدينار مع الاحتفاظ بالكسور.
export const subtotal = computed(
  () =>
    cartItems.value.reduce(
      (sum, item) =>
        sum +
        Math.round(
          Number(item.product.price) * 100,
        ) *
          item.qty,
      0,
    ) / 100,
);

function saveCart(next) {
  if (persist("heartmade_cart", next)) {
    cart.value = next;

    return true;
  }

  return false;
}

export function addToCart(product, qty = 1) {
  if (
    product.category === "Soon" ||
    Number(product.stock) <= 0
  ) {
    return showNotice(
      "This product is currently unavailable.",
    );
  }

  qty = Math.max(
    1,
    Math.floor(Number(qty) || 1),
  );

  const existing = cart.value.find(
    (item) => item.id === product.id,
  );

  const current = existing?.qty || 0;

  if (current >= Number(product.stock)) {
    return showNotice(
      "You have added all available stock for this product.",
    );
  }

  const quantity = Math.min(
    current + qty,
    Number(product.stock),
  );

  const saved = saveCart(
    existing
      ? cart.value.map((item) =>
          item.id === product.id
            ? {
                ...item,
                qty: quantity,
              }
            : item,
        )
      : [
          ...cart.value,
          {
            id: product.id,
            qty: quantity,
          },
        ],
  );

  if (saved) {
    showNotice("Product added to your bag.");
  }
}

export function updateQty(id, delta) {
  const product = products.value.find(
    (product) => product.id === id,
  );

  saveCart(
    cart.value
      .map((item) =>
        item.id === id
          ? {
              ...item,
              qty: Math.min(
                Number(product?.stock) || 0,
                item.qty + delta,
              ),
            }
          : item,
      )
      .filter((item) => item.qty > 0),
  );
}

export function removeFromCart(id) {
  saveCart(
    cart.value.filter(
      (item) => item.id !== id,
    ),
  );
}

export function clearCart() {
  saveCart([]);
}

export function saveProducts(next) {
  if (!persist("hm_products", next)) {
    return false;
  }

  products.value = next;

  saveCart(
    cart.value.filter((item) =>
      next.some(
        (product) =>
          product.id === item.id &&
          product.stock > 0 &&
          product.category !== "Soon",
      ),
    ),
  );

  return true;
}

export function saveOrders(next) {
  if (!persist("hm_orders", next)) {
    return false;
  }

  orders.value = next;

  return true;
}

export const productsLoading = ref(false);
export const productsError = ref("");

let storeProductsRequest;

export function loadStoreProducts() {
  if (storeProductsRequest) {
    return storeProductsRequest;
  }

  productsLoading.value = true;
  productsError.value = "";

  storeProductsRequest = (async () => {
    try {
      const collected = [];

      let page = 1;
      let lastPage = 1;

      // تحميل جميع صفحات المنتجات من قاعدة البيانات.
      do {
        const result = await backendRequest(
          `/api/products?page=${page}`,
        );

        if (!Array.isArray(result.data)) {
          throw new Error(
            "Products are temporarily unavailable. Please try again later.",
          );
        }

        collected.push(...result.data);

        lastPage =
          Number(result.last_page) || 1;

        page += 1;
      } while (page <= lastPage);

      // تحديث القائمة المشتركة بين الرئيسية والمتجر.
      products.value = collected;

      // الاحتفاظ بنسخة محلية بعد نجاح التحميل.
      persist("hm_products", collected);

      return collected;
    } catch (error) {
      productsError.value =
        error.message ||
        "Unable to load products. Please try again later.";

      showNotice(productsError.value);

      throw error;
    } finally {
      productsLoading.value = false;
      storeProductsRequest = undefined;
    }
  })();

  return storeProductsRequest;
}

// تحميل المنتجات عند فتح التطبيق.
loadStoreProducts().catch(() => {});