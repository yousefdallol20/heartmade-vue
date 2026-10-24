<script setup>
import {
  ref,
  reactive,
  computed,
  watch,
  nextTick,
  onMounted,
  onUnmounted,
} from "vue";
import Chart from "chart.js/auto";
import { useRouter } from "vue-router";
import { authRequest, backendRequest, initializeCsrf } from "../stores/auth.js";
const router = useRouter();
async function logout() {
  try {
    await authRequest("logout");
    await router.replace("/admin/login");
  } catch (error) {
    showNotice(error.message);
  }
}
import { useNavigation } from "../composables/navigation.js";
import {
  products,
  orders,
  partners,
  inquiries,
  settings,
  persist,
  load,
  saveProducts,
  saveOrders,
  showNotice,
} from "../stores/shop.js";
import { handsImage } from "../data/catalog.js";
import { imageToDataUrl } from "../composables/images.js";
const { navigate } = useNavigation();
const currentTab = ref("overview"),
  mobileNav = ref(false),
  activeModal = ref("");
const titles = {
  overview: "Overview",
  creations: "Creations & Items",
  orders: "Orders",
  impact: "Impact reports & Accounts",
  settings: "Settings",
  notifications: "Notifications",
};
const productSearch = ref("");
const productPage = ref(1);
const productsPerPage = 10;
const orderedAdminProducts = computed(() =>
  [...products.value].sort((a, b) => Number(a.id) - Number(b.id)),
);
const filteredAdminProducts = computed(() => {
  const query = productSearch.value.trim().toLowerCase();
  return orderedAdminProducts.value.filter(
    (product) =>
      !query ||
      [product.id, "#" + product.id, product.name, product.category].some(
        (value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query),
      ),
  );
});
const productTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredAdminProducts.value.length / productsPerPage)),
);
const paginatedAdminProducts = computed(() => {
  const start = (productPage.value - 1) * productsPerPage;
  return filteredAdminProducts.value.slice(start, start + productsPerPage);
});
const productRangeStart = computed(() =>
  filteredAdminProducts.value.length
    ? (productPage.value - 1) * productsPerPage + 1
    : 0,
);
const productRangeEnd = computed(() =>
  Math.min(
    productPage.value * productsPerPage,
    filteredAdminProducts.value.length,
  ),
);
const visibleProductPages = computed(() => {
  const start = Math.max(
    1,
    Math.min(productPage.value - 2, productTotalPages.value - 4),
  );
  const end = Math.min(productTotalPages.value, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
});
function goToProductPage(page) {
  productPage.value = Math.min(productTotalPages.value, Math.max(1, page));
}
watch(
  productSearch,
  () => {
    productPage.value = 1;
  },
  { flush: "sync" },
);
watch(
  productTotalPages,
  (total) => {
    if (productPage.value > total) productPage.value = total;
  },
  { flush: "sync" },
);
function selectOrderProduct(item) {
  const p = products.value.find((p) => p.id === item.product_id);
  if (p) {
    item.name = p.name;
    item.price = Number(p.price);
  } else {
    item.name = "";
    item.price = 0;
  }
}
const statuses = ["pending", "confirmed", "shipped", "delivered"];
const orderSearch = ref("");
const orderStatusFilter = ref("");
const orderFilterOpen = ref(false);

const filteredAdminOrders = computed(() => {
  const query = orderSearch.value.trim().toLowerCase();

  return orders.value.filter((order) => {
    const matchesStatus =
      !orderStatusFilter.value || order.status === orderStatusFilter.value;

    const searchableValues = [
      order.id,
      order.customer_name,
      order.customer_phone,
      order.customer_email,
      ...(order.items || []).map((item) => item.name),
    ];

    const matchesSearch =
      !query ||
      searchableValues.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      );

    return matchesStatus && matchesSearch;
  });
});
const deliveredOrders = computed(() =>
  orders.value.filter((o) => o.status === "delivered"),
);
// جمع المبالغ بأجزاء الدينار لتجنب أخطاء الأعداد العشرية.
function amountCents(value) {
  const text = String(value ?? "0").trim();
  const match = text.match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return 0;
  const cents = Number(match[2]) * 100 + Number((match[3] || "").padEnd(2, "0"));
  return match[1] === "-" ? -cents : cents;
}
function sumOrderAmounts(list) {
  return list.reduce((sum, order) => sum + amountCents(order.total), 0) / 100;
}
function salesDate(order) {
  return new Date(order.delivered_at || order.created_at);
}
const reportingNow = ref(new Date());
let reportingClock;
onMounted(() => { reportingClock = window.setInterval(() => { reportingNow.value = new Date(); }, 60000); });
onUnmounted(() => window.clearInterval(reportingClock));
const salesTotal = computed(() => sumOrderAmounts(deliveredOrders.value));
const cashTotal = computed(() => sumOrderAmounts(deliveredOrders.value.filter((order) =>
  ["cod", "cash on delivery"].includes(String(order.payment_method || "").trim().toLowerCase()),
)));
const paypalTotal = computed(() => sumOrderAmounts(deliveredOrders.value.filter((order) => isPayPalOrder(order))));
const monthlyEarnings = computed(() => {
  const now = reportingNow.value;
  return sumOrderAmounts(deliveredOrders.value.filter((order) => {
    const date = salesDate(order);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }));
});
function switchTab(tab) {
  currentTab.value = tab;
  mobileNav.value = false;
}
function toggleMobileNav() {
  mobileNav.value = !mobileNav.value;
}
function closeModal() {
  activeModal.value = "";
}
watch(activeModal, (value) => {
  document.body.style.overflow = value ? "hidden" : "";
});
function keydown(e) {
  if (e.key === "Escape") closeModal();
}
onMounted(() => window.addEventListener("keydown", keydown));
onUnmounted(() => {
  window.removeEventListener("keydown", keydown);
  document.body.style.overflow = "";
  destroyCharts();
});
const notifications = ref([]);
const unreadCount = ref(0);
const notificationsLoading = ref(false);
const notificationsMarking = ref(false);
const notificationsError = ref("");

let notificationTimer = null;
let notificationLoadPromise = null;
let notificationsDisposed = false;
let notificationRevision = 0;

function mapNotification(notification) {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    time: notification.created_at,
    read: notification.read_at !== null,
    order_id: notification.order_id,
    inquiry_id: notification.inquiry_id,
  };
}

async function loadAdminNotifications() {
  if (notificationsDisposed || notificationsMarking.value) {
    return;
  }

  if (notificationLoadPromise) {
    return notificationLoadPromise;
  }

  notificationsLoading.value = true;

  const revision = notificationRevision;

  notificationLoadPromise = (async () => {
    try {
      const collected = [];
      let page = 1;
      let lastPage = 1;
      let serverUnreadCount = 0;

      do {
        const result = await backendRequest(
          `/api/admin/notifications?per_page=100&page=${page}`,
        );

        if (!Array.isArray(result.data) || !result.meta) {
          throw new Error("Invalid notifications response.");
        }

        collected.push(...result.data);

        serverUnreadCount = Number(result.unread_count) || 0;
        lastPage = Number(result.meta.last_page) || 1;
        page += 1;
      } while (page <= lastPage && !notificationsDisposed);

      if (notificationsDisposed || revision !== notificationRevision) {
        return;
      }

      const uniqueNotifications = [
        ...new Map(
          collected.map((notification) => [notification.id, notification]),
        ).values(),
      ];

      notifications.value = uniqueNotifications
        .map(mapNotification)
        .sort((a, b) => Number(b.id) - Number(a.id));

      unreadCount.value = serverUnreadCount;
      notificationsError.value = "";
    } catch (error) {
      if (!notificationsDisposed && revision === notificationRevision) {
        notificationsError.value =
          error.message || "Could not load notifications.";
      }
    } finally {
      notificationLoadPromise = null;

      if (!notificationsDisposed) {
        notificationsLoading.value = false;
      }
    }
  })();

  return notificationLoadPromise;
}

function notificationTime(time) {
  if (!time) {
    return "Time unavailable";
  }

  const date = new Date(time);

  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function notificationIcon(type) {
  switch (type) {
    case "inquiry":
      return "bi bi-building";

    case "order":
      return "bi bi-bag-check";

    case "email_failed":
      return "bi bi-exclamation-triangle";

    default:
      return "bi bi-bell";
  }
}

async function markSingleNotificationRead(id) {
  const notification = notifications.value.find((item) => item.id === id);

  if (!notification || notification.read || notificationsMarking.value) {
    return;
  }

  notificationsMarking.value = true;
  notificationRevision += 1;
  notificationsError.value = "";

  try {
    await initializeCsrf();

    const result = await backendRequest(
      `/api/admin/notifications/${encodeURIComponent(id)}/read`,
      {
        method: "PATCH",
      },
    );

    if (!result.data || result.data.id !== id) {
      throw new Error("Invalid notification update response.");
    }

    if (notificationsDisposed) {
      return;
    }

    notifications.value = notifications.value.map((item) =>
      item.id === id ? mapNotification(result.data) : item,
    );

    unreadCount.value = Number(result.unread_count) || 0;
  } catch (error) {
    if (!notificationsDisposed) {
      notificationsError.value =
        error.message || "Could not mark the notification as read.";
    }
  } finally {
    if (!notificationsDisposed) {
      notificationsMarking.value = false;
    }
  }
}

async function markAllNotificationsRead() {
  if (!unreadCount.value || notificationsMarking.value) {
    return;
  }

  notificationsMarking.value = true;
  notificationRevision += 1;
  notificationsError.value = "";

  try {
    await initializeCsrf();

    const result = await backendRequest("/api/admin/notifications/read-all", {
      method: "PATCH",
    });

    if (result.success !== true) {
      throw new Error("The server did not confirm the update.");
    }

    if (notificationsDisposed) {
      return;
    }

    notifications.value = notifications.value.map((notification) => ({
      ...notification,
      read: true,
    }));

    unreadCount.value = Number(result.unread_count) || 0;
  } catch (error) {
    if (!notificationsDisposed) {
      notificationsError.value =
        error.message || "Could not mark all notifications as read.";
    }
  } finally {
    if (!notificationsDisposed) {
      notificationsMarking.value = false;
    }
  }
}

function refreshVisibleNotifications() {
  if (document.visibilityState === "visible") {
    void loadAdminNotifications();
  }
}

watch(currentTab, (tab) => {
  if (tab === "notifications") {
    void loadAdminNotifications();
  }
});

onMounted(() => {
  void loadAdminNotifications();

  notificationTimer = window.setInterval(refreshVisibleNotifications, 10000);

  window.addEventListener("focus", refreshVisibleNotifications);

  document.addEventListener("visibilitychange", refreshVisibleNotifications);
});

onUnmounted(() => {
  notificationsDisposed = true;
  notificationRevision += 1;

  window.clearInterval(notificationTimer);

  window.removeEventListener("focus", refreshVisibleNotifications);

  document.removeEventListener("visibilitychange", refreshVisibleNotifications);
});
function closePaymentMenus(event) {
  if (event.type === "keydown" && event.key !== "Escape") return;
  document.querySelectorAll("details.order-payment-control[open]").forEach((menu) => {
    if (event.type === "keydown" || !menu.contains(event.target)) menu.removeAttribute("open");
  });
}
onMounted(() => {
  document.addEventListener("click", closePaymentMenus);
  document.addEventListener("keydown", closePaymentMenus);
});
onUnmounted(() => {
  document.removeEventListener("click", closePaymentMenus);
  document.removeEventListener("keydown", closePaymentMenus);
});
const confirmMessage = ref("");
const confirmVariant = ref("danger");
let onConfirm = () => {};
function askConfirm(message, callback, variant = "danger") {
  confirmVariant.value = variant;
  confirmMessage.value = message;
  onConfirm = callback;
  activeModal.value = "customConfirmModal";
}
function confirmAction() {
  onConfirm();
  closeModal();
}
function deleteProduct(id) {
  askConfirm("Delete this product?", async () => {
    try {
      await initializeCsrf();

      const result = await backendRequest(
        `/api/admin/products/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      );

      const next = products.value.filter((product) => product.id !== id);

      saveProducts(next);

      showNotice(result.message || "Product deleted successfully.");
    } catch (error) {
      showNotice(error.message);
    }
  });
}
const orderSaving = ref(false);
const orderBusyIds = ref(new Set());
let adminOrdersRequest = null;

async function loadAdminOrders() {
  if (adminOrdersRequest) return adminOrdersRequest;
  adminOrdersRequest = (async () => {
    const collected = [];
    let page = 1;
    let lastPage = 1;
    do {
      const result = await backendRequest(`/api/admin/orders?page=${page}`);
      if (!Array.isArray(result.data))
        throw new Error("Invalid orders response.");
      collected.push(...result.data);
      lastPage = Number(result.last_page) || 1;
      page += 1;
    } while (page <= lastPage);
    orders.value = collected.sort((a, b) => Number(b.id) - Number(a.id));
    persist("hm_orders", orders.value);
  })();
  try {
    await adminOrdersRequest;
  } finally {
    adminOrdersRequest = null;
  }
}
function storeSavedOrder(order) {
  const existing = orders.value.some((item) => item.id === order.id);
  orders.value = (
    existing
      ? orders.value.map((item) => (item.id === order.id ? order : item))
      : [order, ...orders.value]
  ).sort((a, b) => Number(b.id) - Number(a.id));
  persist("hm_orders", orders.value);
}
async function refreshOrderRelatedData() {
  const results = await Promise.allSettled([
    loadAdminProducts(),
    loadAdminNotifications(),
  ]);
  for (const result of results)
    if (result.status === "rejected") showNotice(result.reason.message);
}
function isPayPalOrder(order) {
  return String(order?.payment_method || "").trim().toLowerCase() === "paypal";
}
function canMarkOrderPaid(order) {
  if (!order) return false;
  const method = String(order?.payment_method || "").trim().toLowerCase();
  return ["cod", "cash on delivery"].includes(method) &&
    order.payment_status === "unpaid" && order.status !== "cancelled";
}
async function updateOrderPaymentStatus(id, status) {
  const order = orders.value.find((item) => item.id === id);
  if (status !== "paid" || !canMarkOrderPaid(order) || orderBusyIds.value.has(id)) return;
  askConfirm("Confirm that the full payment has been received? Once marked as paid, the payment status cannot be changed.", async () => {
    const current = orders.value.find((item) => item.id === id);
    if (!canMarkOrderPaid(current) || orderBusyIds.value.has(id)) return;
    orderBusyIds.value.add(id);
    try {
      await initializeCsrf();
      const result = await backendRequest(`/api/admin/orders/${encodeURIComponent(id)}`, {
        method: "PATCH", body: { payment_status: "paid" },
      });
      if (!result.data || result.data.payment_status !== "paid") {
        throw new Error("The payment status was not saved. Please reload and try again.");
      }
      storeSavedOrder(result.data);
      showNotice("Payment recorded successfully.");
    } catch (error) {
      showNotice(error.message);
    } finally {
      orderBusyIds.value.delete(id);
      try { await loadAdminOrders(); } catch (error) { showNotice(error.message); }
    }
  }, "payment");
}
function adminOrderPaymentLabel(order) {
  return {
    paid: "Paid",
    unpaid: "Awaiting payment",
    refunded: "Refunded / review required",
    reversed: "Payment reversed",
  }[order.payment_status] || "Payment not recorded";
}
function adminLockedOrderLabel(order) {
  if (order.status === "delivered") return "Delivered";
  if (order.status === "cancelled") return "Cancelled";
  if (order.payment_status === "refunded") return "Refunded / review required";
  if (order.payment_status === "reversed") return "Payment reversed";
  return "Awaiting PayPal payment";
}

function deleteOrder(id) {
  const order = orders.value.find((item) => item.id === id);
  if (!order || orderBusyIds.value.has(id)) return;
  if (isPayPalOrder(order)) {
    return showNotice("PayPal orders cannot be deleted. Their payment records must be retained.");
  }
  if (order.status === "delivered")
    return showNotice("A delivered order cannot be deleted.");
  askConfirm("Delete this order?", async () => {
    if (orderBusyIds.value.has(id)) return;
    orderBusyIds.value.add(id);
    try {
      await initializeCsrf();
      const result = await backendRequest(
        `/api/admin/orders/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      orders.value = orders.value.filter((item) => item.id !== id);
      persist("hm_orders", orders.value);
      showNotice(result.message || "Order deleted successfully.");
      await refreshOrderRelatedData();
    } catch (error) {
      showNotice(error.message);
    } finally {
      orderBusyIds.value.delete(id);
    }
  });
}
async function updateOrderStatus(id, status) {
  const order = orders.value.find((item) => item.id === id);
  if (
    !order ||
    order.status === "delivered" ||
    !statuses.includes(status) ||
    orderBusyIds.value.has(id)
  )
    return;
  if (isPayPalOrder(order) && (order.payment_status !== "paid" || status === "cancelled")) {
    return showNotice("Only paid PayPal orders can be fulfilled. Manage refunds through PayPal.");
  }
  orderBusyIds.value.add(id);
  try {
    await initializeCsrf();
    const result = await backendRequest(
      `/api/admin/orders/${encodeURIComponent(id)}`,
      { method: "PATCH", body: { status } },
    );
    if (!result.data) throw new Error("Invalid saved order response.");
    storeSavedOrder(result.data);
    showNotice(result.message || "Order status updated successfully.");
  } catch (error) {
    showNotice(error.message);
    try {
      await loadAdminOrders();
    } catch (reloadError) {
      showNotice(reloadError.message);
    }
  } finally {
    orderBusyIds.value.delete(id);
  }
}
onMounted(async () => {
  try {
    await loadAdminOrders();
  } catch (error) {
    showNotice(error.message);
  }
});
watch(currentTab, async (tab) => {
  if (tab === "orders") {
    try {
      await loadAdminOrders();
    } catch (error) {
      showNotice(error.message);
    }
  }
});

async function loadAdminProducts() {
  const collected = [];
  let page = 1;
  let lastPage = 1;

  // Load the complete catalog for selectors and reports.
  do {
    const result = await backendRequest(`/api/admin/products?page=${page}`);

    if (!Array.isArray(result.data)) {
      throw new Error("Invalid products response.");
    }

    collected.push(...result.data);
    lastPage = Number(result.last_page) || 1;
    page += 1;
  } while (page <= lastPage);

  // Update the cache after successfully loading Laravel data.
  products.value = collected.sort((a, b) => Number(a.id) - Number(b.id));
  persist("hm_products", products.value);
}

onMounted(async () => {
  try {
    await loadAdminProducts();
  } catch (error) {
    showNotice(error.message);
  }
});

const blankProduct = () => ({
  id: "",
  name: "",
  price: 0,
  stock: 10,
  subtitle: "",
  category: "",
  description: "",
  dimensions: "",
  whats_included: "",
  images: [],
  image_url: "",
  featured: true,
  creator: "Heart Made Studio",
  story: "",
});
const draft = reactive(blankProduct()),
  imageFiles = ref([]),
  saving = ref(false);
function openProductModal() {
  Object.assign(draft, blankProduct());
  imageFiles.value = [];
  activeModal.value = "productModal";
}
function editProduct(id) {
  const p = products.value.find((p) => p.id === id);
  if (!p) return;
  Object.assign(draft, blankProduct(), JSON.parse(JSON.stringify(p)), {
    images: [
      ...new Set((p.images?.length ? p.images : [p.image_url]).filter(Boolean)),
    ],
  });
  imageFiles.value = [];
  activeModal.value = "productModal";
}
const newImagePreviews = ref([]);
function releaseImagePreviews() {
  for (const preview of newImagePreviews.value)
    URL.revokeObjectURL(preview.url);
  newImagePreviews.value = [];
}
watch(
  imageFiles,
  (files) => {
    releaseImagePreviews();
    newImagePreviews.value = files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
  },
  { flush: "sync" },
);
onUnmounted(releaseImagePreviews);
function removeSavedImage(index) {
  if (!saving.value) draft.images.splice(index, 1);
}
function removeNewImage(index) {
  if (!saving.value)
    imageFiles.value = imageFiles.value.filter(
      (_, position) => position !== index,
    );
}
function selectImages(event) {
  const selected = Array.from(event.target.files || []);
  event.target.value = "";
  if (saving.value) return;
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  for (const file of selected) {
    if (!allowedTypes.includes(file.type))
      return showNotice("Choose JPG, PNG, or WebP images.");
    if (file.size > 4 * 1024 * 1024)
      return showNotice("Each image must not exceed 4 MB.");
  }
  const unique = new Map(
    [...imageFiles.value, ...selected].map((file) => [
      JSON.stringify([file.name, file.size, file.lastModified]),
      file,
    ]),
  );
  const next = [...unique.values()];
  if (draft.images.length + next.length > 10)
    return showNotice(
      "Keep no more than 10 images in total. Remove an existing image to add another.",
    );
  imageFiles.value = next;
}
async function saveProductWithUnlimitedImages() {
  if (saving.value) return;

  const price = Number(draft.price);
  const stock = Number(draft.stock);

  if (
    !draft.name.trim() ||
    !draft.category ||
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    return showNotice(
      "Enter a name, category, valid price, and non-negative whole-number stock.",
    );
  }

  if (draft.images.length + imageFiles.value.length > 10) {
    return showNotice("Keep no more than 10 images in total.");
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  for (const file of imageFiles.value) {
    if (!allowedTypes.includes(file.type)) {
      return showNotice("Choose JPG, PNG, or WebP images.");
    }

    if (file.size > 4 * 1024 * 1024) {
      return showNotice("Each image must not exceed 4 MB.");
    }
  }

  saving.value = true;

  try {
    await initializeCsrf();

    const formData = new FormData();

    formData.append("name", draft.name.trim());
    formData.append("price", String(price));
    formData.append("stock", String(stock));
    formData.append("category", draft.category);
    formData.append("subtitle", draft.subtitle || "");
    formData.append("description", draft.description || "");
    formData.append("dimensions", (draft.dimensions || "").trim());
    formData.append("whats_included", (draft.whats_included || "").trim());

    for (const file of imageFiles.value) {
      formData.append("image_files[]", file);
    }

    const editing = Boolean(draft.id);

    if (editing) {
      formData.append("_method", "PATCH");
      formData.append("retained_images", JSON.stringify(draft.images));
    }

    const path = editing
      ? `/api/admin/products/${encodeURIComponent(draft.id)}`
      : "/api/admin/products";

    const result = await backendRequest(path, {
      method: "POST",
      body: formData,
    });

    const savedProduct = result.data;

    if (!savedProduct || !Number.isInteger(savedProduct.id)) {
      throw new Error("Invalid saved product response.");
    }

    // Use the product ID assigned by the database.
    const exists = products.value.some(
      (product) => product.id === savedProduct.id,
    );

    const next = exists
      ? products.value.map((product) =>
          product.id === savedProduct.id ? savedProduct : product,
        )
      : [...products.value, savedProduct];

    products.value = next.sort((a, b) => Number(a.id) - Number(b.id));
    persist("hm_products", products.value);

    if (!editing) {
      productSearch.value = "";
      productPage.value = Math.max(
        1,
        Math.ceil(products.value.length / productsPerPage),
      );
    }

    imageFiles.value = [];
    closeModal();

    showNotice(result.message || "Product saved successfully.");
  } catch (error) {
    showNotice(error.message);
  } finally {
    saving.value = false;
  }
}
const selectedProduct = ref(null);
const detailImages = computed(() =>
  selectedProduct.value?.images?.length
    ? selectedProduct.value.images
    : selectedProduct.value
      ? [selectedProduct.value.image_url]
      : [],
);
function openProductDetailsModal(id) {
  selectedProduct.value = products.value.find((p) => p.id === id);
  if (selectedProduct.value) activeModal.value = "productDetailsModal";
}
function openStorefrontProduct() {
  const id = selectedProduct.value?.id;
  closeModal();
  if (id) navigate("product.html?id=" + encodeURIComponent(id));
}
const blankItem = () => ({
  key: crypto.randomUUID(),
  product_id: "",
  name: "",
  price: 0,
  qty: 1,
});
const blankOrder = () => ({
  id: "",
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  shipping_address: "",
  items: [blankItem()],
  delivery_fee: 0,
  payment_method: "Cash on Delivery",
  status: "pending",
});
const manual = reactive(blankOrder());
const editingDelivered = computed(
  () =>
    !!manual.id &&
    orders.value.find((o) => o.id === manual.id)?.status === "delivered",
);
const itemTotal = computed(() =>
  manual.items.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0),
    0,
  ),
);
const manualTotal = computed(() => itemTotal.value);
function openManualOrderModal() {
  Object.assign(manual, blankOrder());
  activeModal.value = "manualOrderModal";
}
function editOrder(id) {
  const o = orders.value.find((o) => o.id === id);
  if (!o) return;
  if (isPayPalOrder(o)) {
    return showNotice("PayPal order details are managed by checkout. Use the status selector to update a paid order.");
  }
  Object.assign(manual, blankOrder(), JSON.parse(JSON.stringify(o)), {
    items: o.items.map((i) => ({
      ...i,
      key: crypto.randomUUID(),
      product_id:
        i.product_id || products.value.find((p) => p.name === i.name)?.id || "",
      price: Number(i.price ?? (o.items.length === 1 ? o.total / i.qty : 0)),
    })),
  });
  manual.delivery_fee = Math.max(
    0,
    Number(o.delivery_fee ?? Number(o.total) - itemTotal.value),
  );
  activeModal.value = "manualOrderModal";
}
function addOrderItem() {
  manual.items.push(blankItem());
}
function removeOrderItem(index) {
  if (manual.items.length > 1) manual.items.splice(index, 1);
}
async function saveManualOrder() {
  if (orderSaving.value) return;
  if (isPayPalOrder(manual)) {
    return showNotice("PayPal orders must be created and paid through checkout.");
  }
  if (editingDelivered.value)
    return showNotice("A delivered order cannot be modified.");
  if (
    !manual.customer_name.trim() ||
    !manual.items.length ||
    manual.items.some(
      (item) =>
        !Number.isInteger(Number(item.product_id)) ||
        Number(item.product_id) < 1 ||
        !Number.isFinite(Number(item.price)) ||
        Number(item.price) < 0 ||
        !Number.isInteger(Number(item.qty)) ||
        Number(item.qty) < 1,
    )
  )
    return showNotice(
      "Enter a customer name and select products with valid prices and quantities.",
    );
  const ids = manual.items.map((item) => Number(item.product_id));
  if (new Set(ids).size !== ids.length)
    return showNotice("Select each product once and adjust its quantity.");
  const editing = Boolean(manual.id);
  const orderId = manual.id;
  const payload = {
    customer_name: manual.customer_name.trim(),
    customer_phone: String(manual.customer_phone || "").trim() || null,
    customer_email: String(manual.customer_email || "").trim() || null,
    shipping_address: String(manual.shipping_address || "").trim() || null,
    payment_method: manual.payment_method,
    status: manual.status,
    items: manual.items.map((item) => ({
      product_id: Number(item.product_id),
      price: Number(item.price),
      qty: Number(item.qty),
    })),
  };
  orderSaving.value = true;
  try {
    await initializeCsrf();
    const result = await backendRequest(
      editing
        ? `/api/admin/orders/${encodeURIComponent(orderId)}`
        : "/api/admin/orders",
      { method: editing ? "PATCH" : "POST", body: payload },
    );
    if (!result.data || !Number.isInteger(result.data.id))
      throw new Error("Invalid saved order response.");
    storeSavedOrder(result.data);
    closeModal();
    showNotice(result.message || "Order saved successfully.");
    await refreshOrderRelatedData();
  } catch (error) {
    showNotice(error.message);
  } finally {
    orderSaving.value = false;
  }
}
const settingsDraft = reactive({ ...settings.value });
function saveSettings(keys) {
  const next = { ...settings.value };
  for (const key of keys) next[key] = settingsDraft[key];
  if (persist("hm_settings", next)) {
    settings.value = next;
    showNotice("Settings saved on this device.");
  }
}
function saveGeneralInfo() {
  if (
    !settingsDraft.settingName?.trim() ||
    !/^\S+@\S+\.\S+$/.test(settingsDraft.settingEmail || "")
  )
    return showNotice("Enter a studio name and valid email.");
  saveSettings(["settingName", "settingEmail", "settingLocation"]);
}
function saveSocialAccounts() {
  for (const key of ["settingInstagram", "settingFacebook"]) {
    try {
      const url = new URL(settingsDraft[key]);
      if (!["https:", "http:"].includes(url.protocol)) throw Error();
    } catch {
      return showNotice("Enter valid http or https profile URLs.");
    }
  }
  saveSettings(["settingInstagram", "settingFacebook"]);
}
const partnerDraft = reactive({
  id: "",
  name: "",
  url: "",
});

const partnerFile = ref(null);
const partnerSaving = ref(false);
const partnerDeleting = ref(false);

function selectPartnerImage(event) {
  partnerFile.value = event.target.files?.[0] || null;
}

async function loadPartners() {
  const result = await backendRequest("/api/admin/partners");

  if (!Array.isArray(result.data)) {
    throw new Error("Invalid partnerships response.");
  }

  partners.value = result.data;
}

onMounted(async () => {
  try {
    await loadPartners();
  } catch (error) {
    showNotice(error.message);
  }
});

async function savePartnerItem() {
  if (partnerSaving.value || partnerDeleting.value) {
    return;
  }

  if (!partnerDraft.name.trim()) {
    return showNotice("Enter a partner name.");
  }

  if (!partnerDraft.id && !partnerFile.value) {
    return showNotice("Choose a partner image.");
  }

  if (partnerFile.value) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(partnerFile.value.type)) {
      return showNotice("Choose a JPG, PNG, or WebP image.");
    }

    if (partnerFile.value.size > 4 * 1024 * 1024) {
      return showNotice("The image must not exceed 4 MB.");
    }
  }

  partnerSaving.value = true;

  try {
    await initializeCsrf();

    const formData = new FormData();

    formData.append("name", partnerDraft.name.trim());
    formData.append("url", partnerDraft.url.trim());

    if (partnerFile.value) {
      formData.append("image", partnerFile.value);
    }

    const editing = Boolean(partnerDraft.id);

    if (editing) {
      // Use POST with method spoofing for file uploads.
      formData.append("_method", "PATCH");
    }

    const path = editing
      ? `/api/admin/partners/${encodeURIComponent(partnerDraft.id)}`
      : "/api/admin/partners";

    const result = await backendRequest(path, {
      method: "POST",
      body: formData,
    });

    const savedPartner = result.data;

    if (!savedPartner || savedPartner.id == null) {
      throw new Error("Invalid saved partner response.");
    }

    // Update the list using the record saved by Laravel.
    const index = partners.value.findIndex(
      (partner) => partner.id === savedPartner.id,
    );

    if (index === -1) {
      partners.value = [savedPartner, ...partners.value];
    } else {
      partners.value = partners.value.map((partner) =>
        partner.id === savedPartner.id ? savedPartner : partner,
      );
    }

    Object.assign(partnerDraft, {
      id: "",
      name: "",
      url: "",
    });

    partnerFile.value = null;

    const input = document.getElementById("settingPartnerImage");

    if (input) {
      input.value = "";
    }

    showNotice(result.message || "Partner saved successfully.");
  } catch (error) {
    showNotice(error.message);
  } finally {
    partnerSaving.value = false;
  }
}

function deletePartner(id) {
  if (partnerSaving.value || partnerDeleting.value) {
    return;
  }

  askConfirm("Remove this partner?", async () => {
    if (partnerSaving.value || partnerDeleting.value) {
      return;
    }

    partnerDeleting.value = true;

    try {
      await initializeCsrf();

      const result = await backendRequest(
        `/api/admin/partners/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      );

      partners.value = partners.value.filter((partner) => partner.id !== id);

      showNotice(result.message || "Partner deleted successfully.");
    } catch (error) {
      showNotice(error.message);
    } finally {
      partnerDeleting.value = false;
    }
  });
}
const security = reactive({ current: "", password: "", confirm: "" });
async function saveSecuritySettings() {
  if (
    !security.current ||
    security.password.length < 8 ||
    security.password !== security.confirm
  )
    return showNotice(
      "Enter the current password and matching new passwords of at least 8 characters.",
    );
  try {
    const result = await authRequest("change-password", {
      current: security.current,
      password: security.password,
    });
    Object.assign(security, { current: "", password: "", confirm: "" });
    showNotice(result.message);
    await router.replace("/admin/login");
  } catch (error) {
    showNotice(error.message);
  }
}
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const palette = [
  "#bd6c59",
  "#648272",
  "#c9902a",
  "#b89485",
  "#7a97a5",
  "#d8a094",
  "#879773",
  "#d4bb82",
  "#b49bb6",
];
const salesYear = ref(new Date().getFullYear()),
  downloadYear = ref(new Date().getFullYear()),
  downloadMonth = ref("all");
const selectedProductFilter = ref(null),
  selectedMonth = ref(null);
const years = computed(() =>
  [
    ...new Set([
      new Date().getFullYear(),
      ...orders.value
        .map((o) => salesDate(o).getFullYear())
        .filter(Number.isFinite),
    ]),
  ].sort((a, b) => b - a),
);
// Snapshot item prices are used so later price edits do not rewrite past sales.
function itemEntries(order) {
  return order.items.map((item) => {
    const p = products.value.find(
      (p) => p.id === item.product_id || p.name === item.name,
    );
    const qty = Number(item.qty) || 0;
    const price = Number(
      item.price ??
        p?.price ??
        (order.items.length === 1 ? Number(order.total) / Math.max(qty, 1) : 0),
    );
    return {
      name: p?.name || item.name || "Unknown item",
      qty,
      value: (qty * amountCents(price)) / 100,
    };
  });
}
function statistics(list) {
  const map = new Map();
  for (const order of list) {
    const counted = new Set();
    for (const item of itemEntries(order)) {
      if (!map.has(item.name))
        map.set(item.name, { name: item.name, qty: 0, value: 0, count: 0 });
      const row = map.get(item.name);
      row.qty += item.qty;
      row.value = (amountCents(row.value.toFixed(2)) + amountCents(item.value.toFixed(2))) / 100;
      if (!counted.has(item.name)) {
        row.count++;
        counted.add(item.name);
      }
    }
  }
  return [...map.values()];
}
const yearOrders = computed(() =>
  deliveredOrders.value.filter(
    (o) => salesDate(o).getFullYear() === salesYear.value,
  ),
);
// All catalog creations are represented, including zero-stock products.
const catalogStats = computed(() =>
  products.value.map((p) => {
    const matchingItems = deliveredOrders.value
      .flatMap((o) => o.items.map((item) => ({ item, order: o })))
      .filter(({ item }) =>
        item.product_id ? item.product_id === p.id : item.name === p.name,
      );
    const sold = matchingItems.reduce(
      (sum, { item }) => sum + (Number(item.qty) || 0),
      0,
    );
    const revenue = matchingItems.reduce(
      (sum, { item, order }) => sum + amountCents(String(item.price ??
        (order.items.length === 1 ? Number(order.total) / Math.max(Number(item.qty) || 1, 1) : p.price))) * (Number(item.qty) || 0),
      0,
    ) / 100;
    return {
      id: p.id,
      name: p.name,
      stock: Number(p.stock) || 0,
      price: Number(p.price) || 0,
      sold,
      revenue,
    };
  }),
);
const demoSales = ref(false);
function demoEntries(month) {
  return products.value.map((p, index) => {
    const qty = 220 + ((month * 137 + index * 83) % 680);
    return {
      name: p.name,
      qty,
      value: qty * Number(p.price),
      count: Math.ceil(qty / 8),
    };
  });
}
const selectedStats = computed(() =>
  catalogStats.value.find((p) => p.name === selectedProductFilter.value),
);
const monthlyStats = computed(() =>
  months.map((name, i) => {
    const list = yearOrders.value.filter(
      (o) => salesDate(o).getMonth() === i,
    );
    const entries = (
      demoSales.value ? demoEntries(i) : statistics(list)
    ).filter(
      (p) =>
        !selectedProductFilter.value || p.name === selectedProductFilter.value,
    );
    return {
      name,
      qty: entries.reduce((s, p) => s + p.qty, 0),
      value: entries.reduce((sum, entry) => sum + amountCents(entry.value.toFixed(2)), 0) / 100,
      entries,
    };
  }),
);
const monthDetails = computed(() =>
  selectedMonth.value === null
    ? []
    : monthlyStats.value[selectedMonth.value]?.entries || [],
);
let doughnutChart, monthlyChart;
function destroyCharts() {
  doughnutChart?.destroy();
  monthlyChart?.destroy();
  doughnutChart = null;
  monthlyChart = null;
}
async function updateCharts() {
  await nextTick();
  if (currentTab.value !== "impact") return;
  const doughnut = document.getElementById("productDoughnutChart"),
    monthly = document.getElementById("monthlySalesChart");
  if (!doughnut || !monthly) return;
  const dData = {
    labels: catalogStats.value.map((p) => p.name),
    datasets: [
      {
        data: catalogStats.value.map((p) => 1 + p.sold),
        backgroundColor: palette,
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };
  if (doughnutChart) {
    if (
      JSON.stringify(doughnutChart.data.labels) !==
        JSON.stringify(dData.labels) ||
      JSON.stringify(doughnutChart.data.datasets[0].data) !==
        JSON.stringify(dData.datasets[0].data)
    ) {
      doughnutChart.data = dData;
      doughnutChart.update("none");
    }
  } else
    doughnutChart = new Chart(doughnut, {
      type: "doughnut",
      data: dData,
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                const p = catalogStats.value[context.dataIndex];
                return [
                  "Available quantity: " + p.stock,
                  "Unit price: " + p.price.toFixed(2) + " JD",
                  "Units sold (Delivered): " + p.sold,
                  "Sales revenue: " + p.revenue.toFixed(2) + " JD",
                ];
              },
            },
          },
        },
        onClick: (event, elements) => {
          if (elements[0])
            selectedProductFilter.value =
              catalogStats.value[elements[0].index].name;
        },
      },
    });
  const mData = {
    labels: months.map((m) => m.slice(0, 3)),
    datasets: [
      {
        label: "Units sold",
        data: monthlyStats.value.map((m) => m.qty),
        backgroundColor: "#bd6c59",
        yAxisID: "units",
      },
      {
        label: "Product value (JD)",
        data: monthlyStats.value.map((m) => m.value),
        type: "line",
        borderColor: "#648272",
        yAxisID: "value",
      },
    ],
  };
  if (monthlyChart) {
    monthlyChart.data = mData;
    monthlyChart.update("none");
  } else
    monthlyChart = new Chart(monthly, {
      type: "bar",
      data: mData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          units: { beginAtZero: true },
          value: {
            beginAtZero: true,
            position: "right",
            grid: { drawOnChartArea: false },
          },
        },
        onClick: (event, elements) => {
          if (elements[0]) selectedMonth.value = elements[0].index;
        },
      },
    });
}
watch(
  [currentTab, salesYear, selectedProductFilter, demoSales, orders, products],
  updateCharts,
  { deep: true },
);
watch(salesYear, () => {
  selectedProductFilter.value = null;
  selectedMonth.value = null;
});
function resetProductSalesFilter() {
  selectedProductFilter.value = null;
  selectedMonth.value = null;
}
function csvCell(value) {
  let s = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
function downloadStatsReport() {
  const list = deliveredOrders.value.filter(
    (o) =>
      salesDate(o).getFullYear() === Number(downloadYear.value) &&
      (downloadMonth.value === "all" ||
        salesDate(o).getMonth() === Number(downloadMonth.value)),
  );
  const rows = [
    ["Heart Made Zone — Sales Report"],
    [
      "Year",
      downloadYear.value,
      "Month",
      downloadMonth.value === "all"
        ? "Full year"
        : months[Number(downloadMonth.value)],
    ],
    [
      "Orders",
      list.length,
      "Order totals (JD)",
      sumOrderAmounts(list).toFixed(2),
    ],
    [],
    ["Product", "Units", "Product value (JD)", "Order count"],
    ...statistics(list).map((p) => [
      p.name,
      p.qty,
      p.value.toFixed(2),
      p.count,
    ]),
    [],
    ["Order", "Customer", "Date", "Payment", "Status", "Total (JD)"],
    ...list.map((o) => [
      o.id,
      o.customer_name,
      o.delivered_at || o.created_at,
      o.payment_method,
      o.status,
      Number(o.total).toFixed(2),
    ]),
  ];
  const blob = new Blob(
    ["\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `heartmade-stats-${downloadYear.value}-${downloadMonth.value}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>
<template>
  <aside :class="{ show: mobileNav }" class="admin-sidebar" id="adminSidebar">
    <button
      class="mb-5 d-flex align-items-center gap-2 border-0 bg-transparent text-start p-0 w-100"
      @click="navigate('index.html')"
      style="cursor: pointer"
    >
      <span
        class="d-flex align-items-center justify-content-center rounded-circle text-white"
        style="
          width: 36px;
          height: 36px;
          background-color: var(--terracotta-3, #cf715d);
        "
      >
        <i class="bi bi-heart-fill"></i>
      </span>
      <span>
        <strong class="d-block font-serif-hero fs-5 lh-1">Heart Made</strong>
        <small
          class="text-xs text-uppercase"
          style="
            letter-spacing: 0.15em;
            color: var(--gray-warm-2, #92766a);
            font-size: 10px;
          "
          >ZONE ADMIN</small
        >
      </span>
    </button>
    <nav>
      <button
        :class="{ active: currentTab === 'overview' }"
        class="nav-btn"
        data-tab="overview"
        @click="switchTab('overview')"
      >
        <i class="bi bi-grid"></i> Overview
      </button>
      <button
        :class="{ active: currentTab === 'creations' }"
        class="nav-btn"
        data-tab="creations"
        @click="switchTab('creations')"
      >
        <i class="bi bi-box-seam"></i> Creations
      </button>
      <button
        :class="{ active: currentTab === 'orders' }"
        class="nav-btn"
        data-tab="orders"
        @click="switchTab('orders')"
      >
        <i class="bi bi-bag"></i> Orders
      </button>
      <button
        :class="{ active: currentTab === 'impact' }"
        class="nav-btn"
        data-tab="impact"
        @click="switchTab('impact')"
      >
        <i class="bi bi-bar-chart"></i> Impact reports &amp; Accounts
      </button>
      <button
        type="button"
        class="nav-btn"
        data-tab="notifications"
        :class="{ active: currentTab === 'notifications' }"
        @click="switchTab('notifications')"
      >
        <i class="bi bi-envelope"></i> Notifications
        <span v-if="unreadCount" class="notification-count ms-auto">{{
          unreadCount
        }}</span>
      </button>
      <button
        :class="{ active: currentTab === 'settings' }"
        class="nav-btn"
        data-tab="settings"
        @click="switchTab('settings')"
      >
        <i class="bi bi-gear"></i> Settings
      </button>
    </nav>
  </aside>

  <div
    class="position-fixed inset-0 bg-black/30"
    id="sidebarOverlay"
    @click="toggleMobileNav()"
    style="z-index: 35; inset: 0"
    v-show="mobileNav"
  ></div>

  <main class="admin-main">
    <header
      class="d-flex align-items-center justify-content-between border-bottom border-[var(--border-2)] px-4 py-4 px-md-5 cream-panel"
    >
      <div class="admin-heading d-flex align-items-center gap-3">
        <button
          class="rounded-circle p-2 border-0 bg-transparent d-lg-none"
          @click="toggleMobileNav()"
        >
          <i class="bi bi-list fs-5"></i>
        </button>
        <div>
          <p
            class="mb-1 text-xs fw-bold text-uppercase"
            style="
              letter-spacing: 0.15em;
              color: var(--terracotta-2, #bd6c59);
              font-size: 10px;
            "
          >
            HEART MADE ZONE
          </p>
          <h1 class="mb-0 font-serif-hero fs-3" id="pageTitle">
            {{ titles[currentTab] }}
          </h1>
        </div>
      </div>
      <div class="admin-header-actions d-flex align-items-center gap-3">
        <button
          class="rounded-pill bg-dark px-4 py-2 text-sm text-white border-0 transition"
          @click="navigate('index.html')"
        >
          View storefront
        </button>
        <button
          class="rounded-pill px-4 py-2 border-0"
          @click="logout"
          type="button"
        >
          Sign out
        </button>
      </div>
    </header>
    <section class="p-4 p-md-5">
      <div
        class="admin-tab-content"
        id="tab-overview"
        v-show="currentTab === 'overview'"
      >
        <div class="row g-4">
          <div class="col-sm-6 col-xl-4">
            <div class="settings-card mb-0">
              <div
                class="d-flex align-items-center justify-content-between mb-4"
              >
                <span
                  class="d-flex align-items-center justify-content-center rounded-3 bg-[#f0e2d9] text-[var(--terracotta-2)] icon-box-40"
                >
                  <i class="bi bi-box-seam fs-5"></i>
                </span>
                <span
                  class="text-xs fw-medium text-success"
                  id="statProductsChange"
                  >{{ products.filter(p=&gt;p.featured).length+' featured' }}</span
                >
              </div>
              <p class="mb-1 text-sm text-muted">Items listed</p>
              <h3 class="mb-0 font-serif-hero fs-2" id="statProductsVal">
                {{ products.length }}
              </h3>
            </div>
          </div>
          <div class="col-sm-6 col-xl-4">
            <div class="settings-card mb-0">
              <div
                class="d-flex align-items-center justify-content-between mb-4"
              >
                <span
                  class="d-flex align-items-center justify-content-center rounded-3 bg-[#f0e2d9] text-[var(--terracotta-2)] icon-box-40"
                >
                  <i class="bi bi-bag fs-5"></i>
                </span>
                <span
                  class="text-xs fw-medium text-success"
                  id="statOrdersChange"
                  >{{ orders.filter(o=&gt;o.status==='pending').length+' pending' }}</span
                >
              </div>
              <p class="mb-1 text-sm text-muted">Total orders</p>
              <h3 class="mb-0 font-serif-hero fs-2" id="statOrdersVal">
                {{ orders.length }}
              </h3>
            </div>
          </div>
          <div class="col-sm-6 col-xl-4">
            <div class="settings-card mb-0">
              <div
                class="d-flex align-items-center justify-content-between mb-4"
              >
                <span
                  class="d-flex align-items-center justify-content-center rounded-3 bg-[#f0e2d9] text-[var(--terracotta-2)] icon-box-40"
                >
                  <i class="bi bi-bar-chart fs-5"></i>
                </span>
                <span class="text-xs fw-medium text-success"
                  >Delivered orders</span
                >
              </div>
              <p class="mb-1 text-sm text-muted">Community sales this month</p>
              <h3 class="mb-0 font-serif-hero fs-2" id="statSalesVal">
                {{ monthlyEarnings.toFixed(2) + " JD" }}
              </h3>
            </div>
          </div>
        </div>
        <div class="row g-4 mt-2">
          <div class="col-xl-8">
            <div class="settings-card mb-0">
              <div
                class="d-flex align-items-center justify-content-between mb-4"
              >
                <div>
                  <p class="mb-1 text-xs fw-bold text-uppercase admin-eyebrow">
                    MANAGE YOUR SHOP
                  </p>
                  <h2 class="mb-0 font-serif-hero fs-4">Latest items</h2>
                </div>
                <button
                  class="btn btn-link text-[var(--terracotta-2)] text-decoration-none fw-semibold p-0"
                  @click="switchTab('creations')"
                >
                  View all <i class="bi bi-chevron-right"></i>
                </button>
              </div>
              <div id="latestProductsList">
                <div
                  :key="p.id"
                  class="d-flex align-items-center gap-3 py-3 border-bottom"
                  v-for="p in products.slice(-5).reverse()"
                >
                  <img
                    :alt="p.name"
                    :src="p.image_url"
                    class="rounded-3 object-fit-cover"
                    style="width: 56px; height: 56px"
                  />
                  <div class="flex-grow-1 min-w-0">
                    <p class="mb-0 fw-medium text-truncate">{{ p.name }}</p>
                    <p class="mb-0 text-xs text-muted text-truncate">
                      {{ p.subtitle || p.description }}
                    </p>
                  </div>
                  <span class="d-none d-sm-inline text-xs text-muted">{{
                    p.category
                  }}</span
                  ><strong class="text-sm"
                    >{{ Number(p.price).toFixed(2) }} JD</strong
                  >
                </div>
                <p class="text-muted py-3" v-if="!products.length">
                  No items found.
                </p>
              </div>
            </div>
          </div>
          <div class="col-xl-4">
            <div
              class="rounded-4 p-4 text-dark shadow-sm"
              style="background-color: var(--sage-bg, #dce6dc)"
            >
              <div
                class="d-flex align-items-center justify-content-between mb-4"
              >
                <span
                  class="d-flex align-items-center justify-content-center rounded-3 bg-white/70 text-[var(--sage-text)] icon-box-40"
                >
                  <i class="bi bi-sparkles fs-5"></i>
                </span>
                <span
                  class="rounded-pill bg-white px-3 py-1 text-xs fw-semibold text-[var(--sage-text)]"
                  >This month</span
                >
              </div>
              <h3 class="font-serif-hero fs-3 lh-sm">
                Small steps.<br /><span style="color: var(--sage-text)"
                  >Real change.</span
                >
              </h3>
              <div class="monthly-earnings">
                <strong id="monthlyEarnings"
                  >{{
                    monthlyEarnings.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  }}
                  JD</strong
                ><span>Earned this month · Delivered orders</span>
              </div>
              <p class="mt-3 mb-4 text-sm text-[var(--gray-warm-5)] lh-base">
                Every order helps a young creator practise, contribute, and
                build a life with more choice.
              </p>
              <button
                class="btn btn-link text-[var(--sage-text-2)] text-decoration-none fw-semibold p-0"
                @click="switchTab('impact')"
              >
                Read the impact story <i class="bi bi-arrow-up-right"></i>
              </button>
            </div>
          </div>
        </div>
        <div
          class="mt-4 rounded-4 bg-dark p-4 p-md-4 text-white d-flex flex-wrap align-items-center justify-content-between gap-3 shadow-sm"
        >
          <div>
            <p
              class="mb-1 text-xs fw-bold text-uppercase"
              style="
                letter-spacing: 0.15em;
                color: var(--rose-icon);
                font-size: 10px;
              "
            >
              KEEP THE ZONE GROWING
            </p>
            <h2 class="mb-0 font-serif-hero fs-4">
              Add a new item to the shop.
            </h2>
          </div>
          <button
            class="rounded-pill bg-[var(--rose-icon)] px-4 py-2.5 text-sm fw-semibold text-dark border-0"
            @click="openProductModal()"
          >
            <i class="bi bi-plus-lg"></i> Add item
          </button>
        </div>
      </div>

      <div
        class="admin-tab-content"
        id="tab-creations"
        v-show="currentTab === 'creations'"
      >
        <div class="d-flex align-items-center justify-content-between mb-4">
          <p class="mb-0 text-sm text-muted" id="creationsCount">
            {{ products.length + " items in your shop" }}
          </p>
          <button
            class="rounded-pill bg-dark px-4 py-2.5 text-sm text-white border-0"
            @click="openProductModal()"
          >
            <i class="bi bi-plus-lg"></i> Add item
          </button>
        </div>
        <div class="product-table-toolbar">
          <p class="product-result-count mb-0">
            <strong>{{ productRangeStart }}–{{ productRangeEnd }}</strong> of
            {{ filteredAdminProducts.length }} products
            <span v-if="productSearch">({{ products.length }} total)</span>
          </p>
          <div class="compact-product-search">
            <label for="adminProductSearch" class="visually-hidden"
              >Search products</label
            ><i class="bi bi-search" aria-hidden="true"></i
            ><input
              id="adminProductSearch"
              v-model="productSearch"
              type="search"
              placeholder="Search products..."
              autocomplete="off"
            /><button
              v-if="productSearch"
              type="button"
              @click="productSearch = ''"
              aria-label="Clear product search"
              class="clear-product-search"
            >
              <i class="bi bi-x"></i>
            </button>
          </div>
        </div>
        <div class="table-responsive settings-card p-0">
          <table class="table align-middle mb-0 text-sm">
            <thead
              class="border-bottom border-[var(--border-2)] text-xs text-uppercase"
              style="letter-spacing: 0.05em; color: var(--gray-warm-2)"
            >
              <tr>
                <th class="px-4 py-3">#</th>
                <th class="px-4 py-3">Item Name &amp; Details</th>
                <th class="px-4 py-3 d-none d-sm-table-cell">Category</th>
                <th class="px-4 py-3 d-none d-md-table-cell">Stock</th>
                <th class="px-4 py-3">Price</th>
                <th class="px-4 py-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody id="creationsTableBody">
              <tr :key="p.id" v-for="p in paginatedAdminProducts">
                <td
                  class="px-4 py-3 text-muted text-xs"
                  style="max-width: 180px; overflow-wrap: anywhere"
                >
                  {{
                    "#" +
                    (orderedAdminProducts.findIndex(
                      (item) => item.id === p.id,
                    ) +
                      1)
                  }}
                </td>
                <td class="px-4 py-3">
                  <div class="d-flex align-items-center gap-3">
                    <img
                      :alt="p.name"
                      :src="p.image_url"
                      class="rounded-2 object-fit-cover"
                      style="width: 44px; height: 44px"
                    />
                    <div>
                      <p class="mb-0 fw-medium">{{ p.name }}</p>
                      <p
                        class="mb-0 text-xs text-muted text-truncate"
                        style="max-width: 250px"
                      >
                        {{ p.subtitle || p.description }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 d-none d-sm-table-cell text-muted">
                  {{ p.category }}
                </td>
                <td class="px-4 py-3 d-none d-md-table-cell">{{ p.stock }}</td>
                <td class="px-4 py-3 fw-semibold">
                  {{ Number(p.price).toFixed(2) }} JD
                </td>
                <td class="px-4 py-3 text-end">
                  <button
                    @click="openProductDetailsModal(p.id)"
                    class="btn btn-sm btn-light text-muted rounded-circle p-2 me-1"
                    title="View Details"
                  >
                    <i class="bi bi-eye"></i></button
                  ><button
                    @click="editProduct(p.id)"
                    class="btn btn-sm btn-light text-muted rounded-circle p-2 me-1"
                    title="Edit"
                  >
                    <i class="bi bi-pencil"></i></button
                  ><button
                    @click="deleteProduct(p.id)"
                    class="btn btn-sm btn-light text-danger rounded-circle p-2"
                    title="Delete"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
              <tr v-if="!filteredAdminProducts.length">
                <td class="p-4 text-muted" colspan="6">
                  No matching products found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <nav
          v-if="filteredAdminProducts.length"
          class="product-pagination"
          aria-label="Product pagination"
        >
          <span class="product-page-summary"
            >Page {{ productPage }} of {{ productTotalPages }}</span
          >
          <div class="product-page-buttons">
            <button
              type="button"
              class="product-page-button"
              :disabled="productPage === 1"
              @click="goToProductPage(1)"
              aria-label="First page"
            >
              <i class="bi bi-chevron-double-left" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              class="product-page-button"
              :disabled="productPage === 1"
              @click="goToProductPage(productPage - 1)"
            >
              Previous
            </button>
            <button
              v-for="page in visibleProductPages"
              :key="page"
              type="button"
              class="product-page-button"
              :class="{ 'is-current': page === productPage }"
              :aria-current="page === productPage ? 'page' : undefined"
              :aria-label="'Page ' + page"
              @click="goToProductPage(page)"
            >
              {{ page }}
            </button>
            <button
              type="button"
              class="product-page-button"
              :disabled="productPage === productTotalPages"
              @click="goToProductPage(productPage + 1)"
            >
              Next
            </button>
            <button
              type="button"
              class="product-page-button"
              :disabled="productPage === productTotalPages"
              @click="goToProductPage(productTotalPages)"
              aria-label="Last page"
            >
              <i class="bi bi-chevron-double-right" aria-hidden="true"></i>
            </button>
          </div>
        </nav>
      </div>

      <div
        class="admin-tab-content"
        id="tab-orders"
        v-show="currentTab === 'orders'"
      >
        <div class="orders-toolbar">
          <p class="orders-result-count" id="ordersCount">
            {{ filteredAdminOrders.length }} of {{ orders.length }} orders
          </p>

          <div class="orders-toolbar-actions">
            <div class="orders-search-box">
              <i class="bi bi-search" aria-hidden="true"></i>

              <input
                v-model="orderSearch"
                type="search"
                placeholder="Search orders..."
                aria-label="Search orders"
              />
            </div>

            <div class="orders-filter-control">
              <button
                type="button"
                class="orders-small-button"
                :class="{ 'is-active': orderStatusFilter }"
                :aria-expanded="orderFilterOpen"
                aria-controls="orders-status-filter"
                @click="orderFilterOpen = !orderFilterOpen"
              >
                <i class="bi bi-funnel" aria-hidden="true"></i>
                Filter
                <span v-if="orderStatusFilter" class="orders-filter-dot"></span>
              </button>

              <div
                v-if="orderFilterOpen"
                id="orders-status-filter"
                class="orders-filter-panel"
              >
                <label for="orders-status-select">Order status</label>

                <select
                  id="orders-status-select"
                  v-model="orderStatusFilter"
                  @change="orderFilterOpen = false"
                >
                  <option value="">All statuses</option>

                  <option
                    v-for="status in statuses"
                    :key="status"
                    :value="status"
                  >
                    {{ status.charAt(0).toUpperCase() + status.slice(1) }}
                  </option>
                </select>
              </div>
            </div>

            <button
              type="button"
              class="orders-small-button orders-add-button"
              @click="openManualOrderModal()"
            >
              <i class="bi bi-plus-lg" aria-hidden="true"></i>
              Add Order
            </button>
          </div>
        </div>
        <div id="ordersListContainer">
          <div
            v-if="!filteredAdminOrders.length"
            class="settings-card text-center py-4"
          >
            <i class="bi bi-search text-muted"></i>

            <p class="mb-0 mt-2 text-muted">
              {{
                orders.length
                  ? "No orders match your search or filter."
                  : "No orders yet."
              }}
            </p>
          </div>

          <div
            v-for="o in filteredAdminOrders"
            :key="o.id"
            class="settings-card mb-3"
          >
            <div
              class="order-card-heading d-flex flex-wrap align-items-center justify-content-between gap-3"
            >
              <div class="d-flex align-items-center flex-wrap gap-3">
                <span class="font-serif-hero fs-5 fw-bold mb-0">
                  {{ o.customer_name }}
                </span>

                <select
                  v-if="
                    o.status !== 'delivered' &&
                    (!isPayPalOrder(o) || o.payment_status === 'paid')
                  "
                  :value="o.status"
                  @change="updateOrderStatus(o.id, $event.target.value)"
                  :disabled="orderBusyIds.has(o.id)"
                  class="form-select form-select-sm rounded-pill text-xs fw-semibold px-3 py-1 order-status-select bg-white text-dark"
                  style="width: auto; height: 32px"
                >
                  <option
                    v-for="status in statuses"
                    :key="status"
                    :value="status"
                  >
                    {{ status[0].toUpperCase() + status.slice(1) }}
                  </option>
                </select>

                <span
                  v-else
                  class="delivered-status rounded-pill border bg-white px-3 py-1 text-xs fw-semibold"
                >
                  <i class="bi bi-lock me-1"></i>
                  {{ adminLockedOrderLabel(o) }}
                </span>
              </div>

              <div class="text-end">
                <h5 class="font-serif-hero mb-0">
                  {{ Number(o.total).toFixed(2) }} JD
                </h5>

                <small class="text-xs text-muted d-block">
                  {{ new Date(o.created_at).toLocaleDateString() }}
                </small>
                <details v-if="canMarkOrderPaid(o)" class="order-payment-control">
                  <summary class="order-payment-trigger"
                    :aria-disabled="orderBusyIds.has(o.id)"
                    :aria-label="'Payment status for order ' + o.id"
                    @click="orderBusyIds.has(o.id) && $event.preventDefault()">
                    <i class="bi bi-clock" aria-hidden="true"></i>
                    <span>{{ orderBusyIds.has(o.id) ? 'Saving payment...' : 'Awaiting payment' }}</span>
                    <i class="bi bi-chevron-down payment-chevron" aria-hidden="true"></i>
                  </summary>
                  <div class="order-payment-options">
                    <p class="payment-options-label">PAYMENT STATUS</p>
                    <button type="button" class="payment-option is-current"
                      @click="$event.currentTarget.closest('details').removeAttribute('open')">
                      <i class="bi bi-clock" aria-hidden="true"></i><span>Awaiting payment</span>
                      <i class="bi bi-check2 ms-auto" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="payment-option payment-option-paid"
                      :disabled="orderBusyIds.has(o.id)"
                      @click="$event.currentTarget.closest('details').removeAttribute('open'); updateOrderPaymentStatus(o.id, 'paid')">
                      <i class="bi bi-check-circle" aria-hidden="true"></i><span>Mark as paid</span>
                    </button>
                  </div>
                </details>
                <span
                  v-else
                  class="order-payment-badge"
                  :class="{
                    'is-paid': o.payment_status === 'paid',
                    'is-pending': o.payment_status === 'unpaid',
                    'is-unknown': !['paid', 'unpaid'].includes(
                      o.payment_status,
                    ),
                  }"
                >
                  <i
                    :class="
                      o.payment_status === 'paid'
                        ? 'bi bi-lock-fill'
                        : 'bi bi-clock'
                    "
                    aria-hidden="true"
                  ></i>
                  {{ adminOrderPaymentLabel(o) }}
                </span>
              </div>
            </div>

            <div
              class="order-contact-info d-flex flex-wrap gap-3 align-items-center mt-2 text-sm text-muted"
            >
              <span>
                <i class="bi bi-telephone text-dark"></i>
                {{ o.customer_phone || "No phone" }}
              </span>

              <span>
                <i class="bi bi-envelope"></i>
                {{ o.customer_email }}
              </span>

              <span>
                <i class="bi bi-geo-alt"></i>
                {{ o.shipping_address }}
              </span>

              <span>
                <i class="bi bi-credit-card text-success"></i>
                {{ o.payment_method }}
              </span>
            </div>

            <div
              class="order-card-footer mt-3 pt-3 border-top d-flex flex-wrap align-items-center justify-content-between gap-2"
            >
              <div class="d-flex flex-wrap gap-1">
                <span
                  v-for="(i, index) in o.items"
                  :key="index"
                  class="badge bg-[#f0e2d9] text-dark rounded-pill text-xs fw-normal px-2 py-1"
                >
                  {{ i.qty }}×{{ i.name }}
                </span>
              </div>

              <div v-if="o.checkout_payment" class="order-paypal-details">
                <span><strong>PayPal status:</strong> {{ o.checkout_payment.status }}</span>
                <span><strong>PayPal amount:</strong> USD {{ Number(o.checkout_payment.payment_amount).toFixed(2) }}</span>
                <span><strong>Payment reference:</strong> {{ o.checkout_payment.reference }}</span>
                <span v-if="o.checkout_payment.paypal_capture_id"><strong>Capture ID:</strong> {{ o.checkout_payment.paypal_capture_id }}</span>
              </div>

              <div class="d-flex gap-2" v-if="!isPayPalOrder(o)">
                <button
                  type="button"
                  @click="editOrder(o.id)"
                  :disabled="o.status === 'delivered' || orderBusyIds.has(o.id)"
                  class="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1"
                  aria-label="Edit order"
                  title="Edit order"
                >
                  <i class="bi bi-pencil"></i>
                </button>

                <button
                  type="button"
                  @click="deleteOrder(o.id)"
                  :disabled="o.status === 'delivered' || orderBusyIds.has(o.id)"
                  class="btn btn-sm btn-outline-danger rounded-pill px-3 py-1 text-xs"
                >
                  Delete order
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="admin-tab-content"
        id="tab-impact"
        v-show="currentTab === 'impact'"
      >
        <div class="row g-4 mb-4">
          <div class="col-md-6">
            <div class="settings-card mb-0 h-100">
              <div
                class="d-flex align-items-center justify-content-between mb-3"
              >
                <span
                  class="d-flex align-items-center justify-content-center rounded-3 bg-[#f0e2d9] text-[var(--terracotta-2)] icon-box-40"
                >
                  <i class="bi bi-cash fs-5"></i>
                </span>
                <span
                  class="badge bg-[#f0e2d9] text-[var(--terracotta-2)] rounded-pill px-3 py-1 text-xs"
                  >Cash on Delivery</span
                >
              </div>
              <p class="mb-1 text-sm text-muted">Total Cash Payments · All time</p>
              <h3
                class="mb-0 font-serif-hero fs-2 text-[var(--terracotta-2)]"
                id="cashTotalVal"
              >
                {{ cashTotal.toFixed(2) + " JD" }}
              </h3>
            </div>
          </div>
          <div class="col-md-6">
            <div class="settings-card mb-0 h-100">
              <div
                class="d-flex align-items-center justify-content-between mb-3"
              >
                <span
                  class="d-flex align-items-center justify-content-center rounded-3 bg-[#f0e2d9] text-[var(--sage-text)] icon-box-40"
                >
                  <i class="bi bi-paypal fs-5"></i>
                </span>
                <span
                  class="badge bg-[#e2f0e6] text-[var(--sage-text)] rounded-pill px-3 py-1 text-xs"
                  >PayPal</span
                >
              </div>
              <p class="mb-1 text-sm text-muted">Total PayPal Payments · All time</p>
              <h3
                class="mb-0 font-serif-hero fs-2 text-[var(--sage-text)]"
                id="paypalTotalVal"
              >
                {{ paypalTotal.toFixed(2) + " JD" }}
              </h3>
            </div>
          </div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-12">
            <div class="settings-card mb-0">
              <div
                class="d-flex align-items-center justify-content-between mb-3"
              >
                <div>
                  <p class="mb-1 text-xs fw-bold text-uppercase admin-eyebrow">
                    DELIVERED PRODUCT SALES
                  </p>
                  <h2 class="mb-0 font-serif-hero fs-4">
                    Products &amp; Services Overview
                  </h2>
                  <p class="text-sm text-muted mt-2 mb-0">
                    All products stay visible. Larger slices reflect more
                    Delivered sales; unsold products retain a small preview
                    slice.
                  </p>
                </div>
              </div>
              <div class="row align-items-center g-4">
                <div class="col-lg-4">
                  <div class="p-3 bg-light rounded-4 border">
                    <h6 class="font-serif-hero fs-6 mb-3 text-dark">
                      Products Legend
                    </h6>
                    <div
                      class="d-flex flex-column gap-2"
                      id="productDoughnutLegend"
                      style="max-height: 250px; overflow-y: auto"
                    >
                      <button
                        :key="p.name"
                        @click="selectedProductFilter = p.name"
                        class="d-flex align-items-center justify-content-between p-2 rounded-2 bg-white border shadow-sm"
                        v-for="(p, i) in catalogStats"
                      >
                        <span
                          class="d-flex align-items-center gap-2 overflow-hidden"
                          ><span
                            :style="{
                              width: '12px',
                              height: '12px',
                              backgroundColor: palette[i % palette.length],
                            }"
                            class="rounded-circle"
                          ></span
                          ><span
                            class="text-xs fw-medium text-truncate text-dark"
                            >{{ p.name }}</span
                          ></span
                        ><span
                          class="badge bg-light text-dark rounded-pill text-xs px-2"
                          >{{ p.sold }} sold</span
                        >
                      </button>
                    </div>
                  </div>
                </div>
                <div class="col-lg-8">
                  <div style="position: relative; height: 280px; width: 100%">
                    <canvas id="productDoughnutChart"></canvas>
                  </div>
                </div>
              </div>
              <div class="mt-4" id="productSelectionInfo">
                <div class="p-3 rounded-4 border bg-light text-sm text-muted">
                  <template v-if="selectedStats"
                    ><strong>{{ selectedStats.name }}</strong>
                    <div class="row g-2 mt-2">
                      <div class="col-6 col-md-3">
                        <span class="d-block">Unit Price</span
                        ><strong
                          >{{ selectedStats.price.toFixed(2) }} JD</strong
                        >
                      </div>
                      <div class="col-6 col-md-3">
                        <span class="d-block">Remaining</span
                        ><strong>{{ selectedStats.stock }}</strong>
                      </div>
                      <div class="col-6 col-md-3">
                        <span class="d-block">Units Sold</span
                        ><strong>{{ selectedStats.sold }}</strong>
                      </div>
                      <div class="col-6 col-md-3">
                        <span class="d-block">Sales Revenue</span
                        ><strong
                          >{{ selectedStats.revenue.toFixed(2) }} JD</strong
                        >
                      </div>
                    </div></template
                  ><template v-else=""
                    >Click on a chart slice or a product in the legend to see
                    its price, remaining stock, sold quantity and sales revenue
                    (Delivered orders only).</template
                  >
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-12">
            <div class="settings-card mb-0">
              <div
                class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3"
              >
                <div>
                  <p class="mb-1 text-xs fw-bold text-uppercase admin-eyebrow">
                    PRODUCT SALES
                  </p>
                  <h2 class="mb-0 font-serif-hero fs-4">
                    Sales by Product (Quantity &amp; Total Value)
                  </h2>
                </div>
                <div class="d-flex align-items-center gap-2">
                  <button
                    class="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1 text-xs"
                    id="resetProductFilterBtn"
                    @click="resetProductSalesFilter()"
                    v-show="selectedProductFilter"
                  >
                    <i class="bi bi-arrow-counterclockwise"></i> Show All
                    Products
                  </button>
                  <select
                    class="form-select form-select-sm rounded-pill width-auto"
                    id="salesYearSelect"
                    v-model.number="salesYear"
                  >
                    <option :key="year" :value="year" v-for="year in years">
                      {{ year }}
                    </option>
                  </select>
                </div>
              </div>
              <div
                class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"
              >
                <span class="text-sm text-muted">{{
                  demoSales
                    ? "Illustrative company-scale sales · Demo data"
                    : "Actual local order data"
                }}</span
                ><label class="form-check form-switch mb-0"
                  ><input
                    class="form-check-input"
                    type="checkbox"
                    v-model="demoSales"
                    id="demoSalesToggle"
                  /><span class="form-check-label text-sm"
                    >Demo sales</span
                  ></label
                >
              </div>
              <div style="position: relative; height: 340px; width: 100%">
                <canvas id="monthlySalesChart"></canvas>
              </div>
              <p class="text-xs text-muted mt-2 mb-0">
                <i class="bi bi-hand-index"></i> Click on any month to see how
                many units were sold and the final price for each product.
              </p>
              <div class="mt-3" id="monthSalesDetails">
                <div
                  class="p-3 rounded-4 border bg-white"
                  v-if="selectedMonth !== null"
                >
                  <strong>{{ months[selectedMonth] }} {{ salesYear }}</strong>
                  <div
                    :key="p.name"
                    class="d-flex justify-content-between py-2 border-bottom"
                    v-for="p in monthDetails"
                  >
                    <span>{{ p.name }}</span
                    ><span
                      >{{ p.qty }} units · {{ p.value.toFixed(2) }} JD</span
                    >
                  </div>
                  <p class="text-muted mb-0" v-if="!monthDetails.length">
                    No sales in this month.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-4">
          <div class="col-md-6">
            <div class="settings-card mb-0 h-100">
              <div
                class="d-flex align-items-center justify-content-between mb-3"
              >
                <span
                  class="d-flex align-items-center justify-content-center rounded-3 bg-[#f0e2d9] text-[var(--terracotta-2)] icon-box-40"
                >
                  <i class="bi bi-cash-coin fs-5"></i>
                </span>
                <span class="text-xs fw-medium text-success"
                  >Delivered orders</span
                >
              </div>
              <p class="mb-1 text-sm text-muted">Total community sales · All time</p>
              <h3
                class="mb-0 font-serif-hero fs-1 text-[var(--terracotta-2)]"
                id="impactTotalSales"
              >
                {{ salesTotal.toFixed(2) + " JD" }}
              </h3>
            </div>
          </div>
          <div class="col-md-6">
            <div class="settings-card mb-0 h-100">
              <div
                class="d-flex align-items-center justify-content-between mb-3"
              >
                <span
                  class="d-flex align-items-center justify-content-center rounded-3 bg-[#f0e2d9] text-[var(--sage-text)] icon-box-40"
                >
                  <i class="bi bi-bag-check fs-5"></i>
                </span>
                <span class="text-xs fw-medium text-success"
                  >Fulfilled successfully</span
                >
              </div>
              <p class="mb-1 text-sm text-muted">Orders fulfilled</p>
              <h3
                class="mb-0 font-serif-hero fs-1 text-[var(--sage-text)]"
                id="impactTotalOrders"
              >
                {{ orders.filter(o=&gt;o.status==='delivered').length }}
              </h3>
            </div>
          </div>
        </div>

        <div class="row g-4 mt-1">
          <div class="col-12">
            <div class="settings-card mb-0">
              <div
                class="d-flex flex-wrap align-items-end justify-content-between gap-3"
              >
                <div>
                  <p class="mb-1 text-xs fw-bold text-uppercase admin-eyebrow">
                    EXPORT
                  </p>
                  <h2 class="mb-1 font-serif-hero fs-4">Download Statistics</h2>
                  <p class="mb-0 text-sm text-muted">
                    Choose a year and a month (or the full year) to download the
                    local-order statistics report (excludes illustrative demo
                    sales).
                  </p>
                </div>
                <div class="d-flex flex-wrap align-items-center gap-2">
                  <select
                    class="form-select form-select-sm rounded-pill width-auto"
                    id="downloadYearSelect"
                    v-model.number="downloadYear"
                  >
                    <option :key="year" :value="year" v-for="year in years">
                      {{ year }}
                    </option>
                  </select>
                  <select
                    class="form-select form-select-sm rounded-pill width-auto"
                    id="downloadMonthSelect"
                    v-model="downloadMonth"
                  >
                    <option value="all">Full year</option>
                    <option
                      :key="i"
                      :value="String(i)"
                      v-for="(month, i) in months"
                    >
                      {{ month }}
                    </option>
                  </select>
                  <button
                    class="rounded-pill bg-dark px-4 py-2 text-sm text-white border-0"
                    @click="downloadStatsReport()"
                  >
                    <i class="bi bi-download"></i> Download Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="admin-tab-content"
        id="tab-settings"
        v-show="currentTab === 'settings'"
      >
        <div style="max-width: 800px; margin: 0 auto">
          <h2 class="font-serif-hero fs-3 mb-2">
            Studio Settings &amp; Security
          </h2>
          <p class="text-sm text-muted mb-4">
            Manage local shop details and social accounts. Password controls are
            a visual demo.
          </p>
          <div class="settings-card">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div
                class="d-flex align-items-center gap-2 text-[var(--terracotta-2)]"
              >
                <i class="bi bi-shop fs-5"></i>
                <h3 class="font-serif-hero fs-5 mb-0">General Studio Info</h3>
              </div>
              <button
                class="btn btn-dark rounded-pill px-3 py-1 text-xs fw-semibold shadow-sm d-flex align-items-center gap-1"
                @click="saveGeneralInfo()"
                type="button"
              >
                <i class="bi bi-check-lg"></i> Save Info
              </button>
            </div>
            <div class="mb-3">
              <label for="settingName" class="form-label">Studio Name</label>
              <input
                class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
                id="settingName"
                type="text"
                v-model="settingsDraft.settingName"
              />
            </div>
            <div class="mb-3">
              <label for="settingEmail" class="form-label">Contact Email</label>
              <input
                class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
                id="settingEmail"
                type="email"
                v-model="settingsDraft.settingEmail"
              />
            </div>
            <div class="mb-0">
              <label for="settingLocation" class="form-label">Location</label>
              <input
                class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
                id="settingLocation"
                type="text"
                v-model="settingsDraft.settingLocation"
              />
            </div>
          </div>
          <div class="settings-card">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div class="d-flex align-items-center gap-2 text-primary">
                <i class="bi bi-share fs-5"></i>
                <h3 class="font-serif-hero fs-5 mb-0">Social Media Accounts</h3>
              </div>
              <button
                class="btn btn-dark rounded-pill px-3 py-1 text-xs fw-semibold shadow-sm d-flex align-items-center gap-1"
                @click="saveSocialAccounts()"
                type="button"
              >
                <i class="bi bi-check-lg"></i> Save Social
              </button>
            </div>
            <div class="mb-3">
              <label class="form-label"
                ><i class="bi bi-instagram text-danger"></i> Instagram Profile
                URL</label
              >
              <input
                class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
                id="settingInstagram"
                type="url"
                v-model="settingsDraft.settingInstagram"
              />
            </div>
            <div class="mb-0">
              <label class="form-label"
                ><i class="bi bi-facebook text-primary"></i> Facebook Page
                URL</label
              >
              <input
                class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
                id="settingFacebook"
                type="url"
                v-model="settingsDraft.settingFacebook"
              />
            </div>
          </div>
          <div class="settings-card position-relative">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div class="d-flex align-items-center gap-2 text-warning">
                <i class="bi bi-briefcase fs-5"></i>
                <h3 class="font-serif-hero fs-5 mb-0">Partnerships</h3>
              </div>
              <button
                class="btn btn-dark rounded-pill px-3 py-1 text-xs fw-semibold shadow-sm d-flex align-items-center gap-1"
                @click="savePartnerItem()"
                :disabled="partnerSaving || partnerDeleting"
                type="button"
              >
                <i class="bi bi-check-lg"></i> Save Partner
              </button>
            </div>
            <input id="editPartnerId" type="hidden" v-model="partnerDraft.id" />
            <div class="mb-3">
              <label for="settingPartnerName" class="form-label"
                >Partner Name</label
              >
              <input
                class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
                id="settingPartnerName"
                placeholder="e.g. Acme Corporation"
                type="text"
                v-model="partnerDraft.name"
              />
            </div>
            <div class="mb-3">
              <label for="settingPartnerUrl" class="form-label"
                >Partner Email or Website URL</label
              >
              <input
                class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
                id="settingPartnerUrl"
                placeholder="partner@example.com or https://example.com"
                type="text"
                v-model="partnerDraft.url"
              />
            </div>
            <div class="mb-3">
              <label class="form-label">Partner Image / Logo</label>
              <div class="d-flex align-items-center gap-2">
                <label
                  class="btn btn-outline-secondary btn-sm mb-0 text-xs fw-semibold"
                  for="settingPartnerImage"
                  style="cursor: pointer"
                >
                  Browse...
                </label>
                <input
                  @change="selectPartnerImage"
                  accept="image/jpeg,image/png,image/webp"
                  class="d-none"
                  id="settingPartnerImage"
                  type="file"
                />
                <span class="text-muted text-sm" id="partnerFileName">{{
                  partnerFile?.name || "No file chosen"
                }}</span>
              </div>
            </div>
            <div class="p-3 rounded-4 border bg-light mt-4">
              <h6 class="font-serif-hero fs-6 mb-3 text-secondary">
                Current Partnerships
              </h6>
              <div class="d-flex flex-column gap-3" id="currentPartnersList">
                <div
                  :key="p.id"
                  class="d-flex align-items-center gap-3"
                  v-for="p in partners"
                >
                  <img
                    :alt="p.name"
                    :src="p.image"
                    style="width: 50px; height: 50px; object-fit: cover"
                    v-if="p.image"
                  />
                  <div class="flex-grow-1">
                    <strong>{{ p.name }}</strong>
                    <p class="mb-0 text-muted text-sm">{{ p.url }}</p>
                  </div>
                  <button
                    @click="deletePartner(p.id)"
                    class="btn btn-outline-danger btn-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="settings-card">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div class="d-flex align-items-center gap-2 text-success">
                <i class="bi bi-shield-lock fs-5"></i>
                <h3 class="font-serif-hero fs-5 mb-0">
                  Password Reset &amp; Security
                </h3>
              </div>
              <button
                class="btn btn-dark rounded-pill px-3 py-1 text-xs fw-semibold shadow-sm d-flex align-items-center gap-1"
                @click="saveSecuritySettings()"
                type="button"
              >
                <i class="bi bi-check-lg"></i> Save Security
              </button>
            </div>
            <div class="mb-3">
              <label for="currentPassword" class="form-label"
                >Current Password</label
              >
              <input
                class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
                id="currentPassword"
                placeholder="••••••••"
                type="password"
                v-model="security.current"
              />
            </div>
            <div class="mb-3">
              <label for="newPassword" class="form-label">New Password</label>
              <input
                class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
                id="newPassword"
                placeholder="••••••••"
                type="password"
                v-model="security.password"
              />
            </div>
            <div class="mb-0">
              <label for="confirmPassword" class="form-label"
                >Confirm New Password</label
              >
              <input
                class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
                id="confirmPassword"
                placeholder="••••••••"
                type="password"
                v-model="security.confirm"
              />
            </div>
          </div>
        </div>
      </div>
      <div
        id="tab-notifications"
        class="admin-tab-content"
        v-show="currentTab === 'notifications'"
      >
        <div
          class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4"
        >
          <div>
            <p class="admin-eyebrow mb-1">STUDIO INBOX</p>
            <h2 class="font-serif-hero fs-3 mb-1">Your notifications</h2>
            <p class="text-sm text-muted mb-0">
              {{ unreadCount }} unread · {{ notifications.length }} messages
            </p>
          </div>
          <button
            type="button"
            @click="markAllNotificationsRead"
            :disabled="!unreadCount"
            class="btn btn-dark rounded-pill px-4 py-2"
            id="readAllNotifications"
          >
            <i class="bi bi-check2-all me-2"></i>Mark all as read
          </button>
        </div>
        <div id="notificationsList" class="d-flex flex-column gap-3">
          <button
            v-for="n in notifications"
            :key="n.id"
            type="button"
            @click="markSingleNotificationRead(n.id)"
            class="notification-card text-start"
            :class="{ 'notification-unread': !n.read }"
            :aria-label="n.title + (n.read ? ', read' : ', unread')"
          >
            <span class="notification-message-icon"
              ><i
                :class="
                  n.title === 'Corporate inquiry'
                    ? 'bi bi-building'
                    : 'bi bi-bag-check'
                "
              ></i></span
            ><span class="notification-copy"
              ><span class="d-flex align-items-center gap-2"
                ><strong>{{ n.title }}</strong
                ><span
                  v-if="!n.read"
                  class="unread-dot"
                  aria-label="Unread"
                ></span></span
              ><span class="notification-body">{{ n.message }}</span></span
            ><span class="notification-meta">
              <time :datetime="n.time || undefined" class="notification-time">
                {{ notificationTime(n.time) }}
              </time>

              <span
                v-if="n.inquiry_id != null || n.order_id != null"
                class="notification-reference"
              >
                {{
                  n.inquiry_id != null
                    ? "Inquiry #" + n.inquiry_id
                    : "Order #" + n.order_id
                }}
              </span>
            </span>
          </button>
        </div>
        <div
          v-if="!notifications.length"
          class="settings-card text-center py-5"
        >
          <i class="bi bi-envelope-open fs-1 text-muted"></i>
          <h3 class="font-serif-hero mt-3">You're all caught up</h3>
          <p class="text-muted mb-0">
            New orders and corporate inquiries will appear here.
          </p>
        </div>
      </div>
    </section>
  </main>
  <div v-if="activeModal" class="modal-backdrop show"></div>

  <div
    :aria-label="'customConfirmModal'"
    @click.self="closeModal"
    aria-modal="true"
    class="modal show vue-modal display-block"
    id="customConfirmModal"
    role="dialog"
    tabindex="-1"
    v-if="activeModal === 'customConfirmModal'"
  >
    <div class="modal-dialog modal-dialog-centered" style="max-width: 360px">
      <div
        class="modal-content rounded-4 p-4 border-0 shadow-lg text-center cream-panel"
      >
        <div class="mb-3">
          <span
            class="d-inline-flex align-items-center justify-content-center rounded-circle"
            :class="confirmVariant === 'payment' ? 'payment-confirm-icon' : 'bg-[#fae8e6] text-danger'"
            style="width: 50px; height: 50px"
          >
            <i class="bi fs-4" :class="confirmVariant === 'payment' ? 'bi-cash-coin' : 'bi-exclamation-triangle'"></i>
          </span>
        </div>
        <h4 class="font-serif-hero fs-5 mb-2">{{ confirmVariant === "payment" ? "Confirm payment" : "Are you sure?" }}</h4>
        <p class="text-sm text-muted mb-4" id="confirmMessageText">
          {{ confirmMessage }}
        </p>
        <div class="d-flex gap-2">
          <button
            @click="closeModal"
            class="btn btn-outline-secondary rounded-pill flex-grow-1 py-2 text-sm fw-semibold"
            type="button"
          >
            Cancel
          </button>
          <button
            @click="confirmAction"
            class="btn rounded-pill flex-grow-1 py-2 text-sm fw-semibold"
            :class="confirmVariant === 'payment' ? 'payment-confirm-button' : 'btn-danger'"
            id="confirmActionBtn"
            type="button"
          >
            {{ confirmVariant === "payment" ? "Confirm payment" : "Yes, Confirm" }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <div
    :aria-label="'manualOrderModal'"
    @click.self="closeModal"
    aria-modal="true"
    class="modal show vue-modal display-block"
    id="manualOrderModal"
    role="dialog"
    tabindex="-1"
    v-if="activeModal === 'manualOrderModal'"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content rounded-4 p-4 border-0 shadow-lg cream-panel">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h3 class="font-serif-hero fs-4 mb-0">
            {{ manual.id ? "Edit Order" : "Add New Manual Order" }}
          </h3>
          <button
            @click="closeModal"
            aria-label="Close"
            class="btn-close shadow-none"
            type="button"
          ></button>
        </div>
        <div class="space-y-3">
          <label class="d-block mb-2">
            <span class="form-label">Customer Name</span>
            <input
              class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
              id="manCustName"
              placeholder="e.g. Mohammed Ahmed"
              type="text"
              v-model="manual.customer_name"
            />
          </label>
          <label class="d-block mb-2">
            <span class="form-label">Phone Number</span>
            <input
              class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
              id="manCustPhone"
              placeholder="e.g. +962 7 9000 0000"
              type="text"
              v-model="manual.customer_phone"
            />
          </label>
          <label class="d-block mb-2">
            <span class="form-label">Email Address</span>
            <input
              class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
              id="manCustEmail"
              placeholder="example@domain.com"
              type="email"
              v-model="manual.customer_email"
            />
          </label>
          <label class="d-block mb-2">
            <span class="form-label">Shipping Address</span>
            <input
              class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
              id="manShippingAddress"
              placeholder="e.g. Amman, Istiklal St"
              type="text"
              v-model="manual.shipping_address"
            />
          </label>
          <div
            v-for="(item, index) in manual.items"
            :key="item.key"
            class="order-item-editor border rounded-3 p-3 mb-3"
          >
            <label class="d-block mb-2"
              ><span class="form-label">Item Name</span
              ><select
                v-model="item.product_id"
                @change="selectOrderProduct(item)"
                :id="index === 0 ? 'manItemName' : undefined"
                class="form-select rounded-3 bg-white"
              >
                <option value="" disabled>
                  {{ item.name || "Choose a product" }}
                </option>
                <option v-for="p in products" :key="p.id" :value="p.id">
                  {{ p.name }}
                </option>
              </select></label
            >
            <div class="row g-2">
              <label class="col-6"
                ><span class="form-label">Unit Price (JD)</span
                ><input
                  v-model.number="item.price"
                  type="number"
                  min="0"
                  step="0.01"
                  class="form-control rounded-3 bg-white"
                  :id="index === 0 ? 'manItemPrice' : undefined" /></label
              ><label class="col-6"
                ><span class="form-label">Quantity</span
                ><input
                  v-model.number="item.qty"
                  type="number"
                  min="1"
                  step="1"
                  class="form-control rounded-3 bg-white"
                  :id="index === 0 ? 'manItemQty' : undefined"
              /></label>
            </div>
            <div class="d-flex align-items-center justify-content-between mt-2">
              <span class="text-sm text-muted"
                >Line total:
                {{
                  ((Number(item.price) || 0) * (Number(item.qty) || 0)).toFixed(
                    2,
                  )
                }}
                JD</span
              ><button
                v-if="manual.items.length > 1"
                @click="removeOrderItem(index)"
                type="button"
                class="btn btn-sm btn-outline-danger"
                :aria-label="'Remove item ' + (index + 1)"
              >
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
          <button
            type="button"
            class="btn btn-outline-dark rounded-pill mb-3"
            @click="addOrderItem"
          >
            <i class="bi bi-plus-lg me-2"></i>Add Item
          </button>
          <div class="d-flex justify-content-between border-top pt-3 mb-3">
            <strong>Order Total</strong
            ><strong id="manOrderTotal">{{ manualTotal.toFixed(2) }} JD</strong>
          </div>
          <div class="row g-2 mb-2">
            <div class="col-6">
              <label class="d-block">
                <span class="form-label">Payment Method</span>
                <select
                  class="form-select rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
                  id="manPaymentMethod"
                  v-model="manual.payment_method"
                >
                  <option value="Cash on Delivery">Cash on Delivery</option>
                </select>
              </label>
            </div>
            <div class="col-6">
              <label class="d-block">
                <span class="form-label">Order Status</span>
                <select
                  class="form-select rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none order-status-select"
                  v-if="!editingDelivered"
                  id="manOrderStatus"
                  v-model="manual.status"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option></select
                ><span v-else class="form-control bg-white"
                  >Delivered <i class="bi bi-lock"></i
                ></span>
              </label>
            </div>
          </div>
        </div>
        <div class="d-flex gap-2 mt-4">
          <button
            @click="closeModal"
            class="btn btn-outline-secondary rounded-pill flex-grow-1 py-2 text-sm fw-semibold"
            type="button"
          >
            Cancel
          </button>
          <button
            class="btn btn-dark rounded-pill flex-grow-1 py-2 text-sm fw-semibold"
            @click="saveManualOrder()"
            :disabled="orderSaving || editingDelivered"
            type="button"
          >
            {{
              orderSaving
                ? "Saving..."
                : manual.id
                  ? "Save Changes"
                  : "Save Order"
            }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <div
    :aria-label="'productModal'"
    @click.self="closeModal"
    aria-modal="true"
    class="modal show vue-modal display-block"
    id="productModal"
    role="dialog"
    tabindex="-1"
    v-if="activeModal === 'productModal'"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content rounded-4 p-4 border-0 shadow-lg cream-panel">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h3 class="font-serif-hero fs-4 mb-0" id="modalTitle">
            {{ draft.id ? "Edit item" : "Add new item" }}
          </h3>
          <button
            @click="closeModal"
            aria-label="Close"
            class="btn-close shadow-none"
            type="button"
          ></button>
        </div>
        <input id="editProductId" type="hidden" v-model="draft.id" />
        <div class="space-y-3">
          <label class="d-block mb-2">
            <span class="form-label">Item Name</span>
            <input
              class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
              id="prodName"
              placeholder="e.g. Sunlit Bloom Card"
              type="text"
              v-model="draft.name"
            />
          </label>
          <div class="row g-2 mb-2">
            <div class="col-6">
              <label class="d-block">
                <span class="form-label">Price (JD)</span>
                <input
                  class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
                  id="prodPrice"
                  placeholder="4.00"
                  step="0.50"
                  type="number"
                  v-model.number="draft.price"
                />
              </label>
            </div>
            <div class="col-6">
              <label class="d-block">
                <span class="form-label">Stock</span>
                <input
                  class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
                  id="prodStock"
                  type="number"
                  v-model.number="draft.stock"
                />
              </label>
            </div>
          </div>
          <label class="d-block mb-2">
            <span class="form-label">Service Brief / Short Summary</span>
            <input
              class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
              id="prodSubtitle"
              placeholder="Simple Service Summary"
              type="text"
              v-model="draft.subtitle"
            />
          </label>
          <label class="d-block mb-2">
            <span class="form-label">Category</span>
            <select
              class="form-select rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
              id="prodCategory"
              v-model="draft.category"
            >
              <option disabled="" value="">-- Choose from the list : --</option>
              <option value="Cards">Cards</option>
              <option value="Stationery">Stationery</option>
              <option value="Lifestyle &amp; Décor">
                Lifestyle &amp; Décor
              </option>
              <option value="Frames">Frames</option>
              <option value="Wearables">Wearables</option>
              <option value="Bags">Bags</option>
              <option value="Accessories">Accessories</option>
              <option value="Gifting">Gifting</option>
              <option value="Soon">Soon</option>
            </select>
          </label>
          <div
            id="existingImagesContainer"
            class="mb-3"
            v-if="draft.images.length"
          >
            <span class="form-label text-xs text-muted d-block mb-2"
              >Saved Images ({{ draft.images.length }})</span
            >
            <div id="existingImagesGrid" class="product-image-grid">
              <div
                v-for="(img, index) in draft.images"
                :key="img"
                class="product-image-tile"
              >
                <img :src="img" :alt="'Saved product image ' + (index + 1)" />
                <button
                  type="button"
                  class="product-image-remove"
                  :disabled="saving"
                  :aria-label="'Remove saved image ' + (index + 1)"
                  @click="removeSavedImage(index)"
                >
                  <i class="bi bi-x-lg" aria-hidden="true"></i>
                </button>
                <span v-if="index === 0" class="product-image-badge">Main</span>
              </div>
            </div>
            <small class="text-muted d-block mt-2"
              >Click × to remove an image. Changes apply only after
              saving.</small
            >
          </div>
          <div class="mb-3" v-if="newImagePreviews.length">
            <span class="form-label text-xs text-muted d-block mb-2"
              >New Images ({{ imageFiles.length }})</span
            >
            <div class="product-image-grid">
              <div
                v-for="(preview, index) in newImagePreviews"
                :key="preview.url"
                class="product-image-tile"
              >
                <img :src="preview.url" :alt="preview.name" />
                <button
                  type="button"
                  class="product-image-remove"
                  :disabled="saving"
                  :aria-label="'Remove new image ' + (index + 1)"
                  @click="removeNewImage(index)"
                >
                  <i class="bi bi-x-lg" aria-hidden="true"></i>
                </button>
                <span class="product-image-badge">{{
                  !draft.images.length && index === 0 ? "Main" : "New"
                }}</span>
              </div>
            </div>
          </div>
          <div class="mb-3">
            <span class="form-label d-block">Add Product Images</span>
            <div class="input-group">
              <label
                class="input-group-text bg-white rounded-start-3 text-xs fw-semibold text-secondary"
                for="prodImageFiles"
                style="cursor: pointer"
                ><i class="bi bi-folder2-open me-1" aria-hidden="true"></i>
                Browse...</label
              >
              <input
                id="prodImageFiles"
                type="file"
                multiple
                class="d-none"
                accept="image/jpeg,image/png,image/webp"
                :disabled="saving"
                @change="selectImages"
              />
              <span
                id="selectedFilesLabel"
                class="form-control rounded-end-3 bg-white py-2 text-sm text-muted"
                >{{ draft.images.length + imageFiles.length }} / 10 images</span
              >
            </div>
            <small class="text-muted d-block mt-1"
              >New images are added to your saved images. JPG, PNG or WebP; up
              to 4 MB each.</small
            >
          </div>
          <label class="d-block mb-3" for="prodDimensions">
            <span class="form-label">Dimensions</span>
            <input
              id="prodDimensions"
              v-model="draft.dimensions"
              type="text"
              maxlength="255"
              class="form-control rounded-3 bg-white py-2 text-sm shadow-none"
              placeholder="e.g. 14.8 × 10.5 cm (A6) folded"
            />
            <small class="text-muted d-block mt-1"
              >Enter the dimensions only. The heading is added
              automatically.</small
            >
          </label>
          <label class="d-block mb-3" for="prodWhatsIncluded">
            <span class="form-label">What's Included</span>
            <textarea
              id="prodWhatsIncluded"
              v-model="draft.whats_included"
              rows="4"
              maxlength="10000"
              class="form-control rounded-3 bg-white py-2 text-sm shadow-none"
              placeholder="1 folded greeting card&#10;1 premium envelope&#10;1 protective sleeve"
            ></textarea>
            <small class="text-muted d-block mt-1"
              >Enter one included item per line. Each line appears as a bullet
              on the product page.</small
            >
          </label>
          <label class="d-block mb-3">
            <span class="form-label">Item Details &amp; Description</span>
            <textarea
              class="form-control rounded-3 border-[var(--border-3)] bg-white py-2 text-sm shadow-none"
              id="prodDesc"
              placeholder="Detailed item description"
              rows="3"
              v-model="draft.description"
            ></textarea>
          </label>
        </div>
        <div class="d-flex gap-2 mt-4">
          <button
            @click="closeModal"
            class="btn btn-outline-secondary rounded-pill flex-grow-1 py-2 text-sm fw-semibold"
            type="button"
          >
            Cancel
          </button>
          <button
            class="btn btn-dark rounded-pill flex-grow-1 py-2 text-sm fw-semibold"
            @click="saveProductWithUnlimitedImages()"
            :disabled="saving"
            type="button"
          >
            Save item
          </button>
        </div>
      </div>
    </div>
  </div>

  <div
    :aria-label="'productDetailsModal'"
    @click.self="closeModal"
    aria-modal="true"
    class="modal show vue-modal display-block"
    id="productDetailsModal"
    role="dialog"
    tabindex="-1"
    v-if="activeModal === 'productDetailsModal'"
  >
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content rounded-4 p-4 border-0 shadow-lg cream-panel">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h3 class="font-serif-hero fs-3 mb-0" id="detProdName">
            {{ selectedProduct?.name }}
          </h3>
          <button
            @click="closeModal"
            aria-label="Close"
            class="btn-close shadow-none"
            type="button"
          ></button>
        </div>
        <div class="mb-4">
          <h6 class="font-serif-hero fs-6 mb-2">
            Item Images (<span id="detImgCount">{{ detailImages.length }}</span
            >)
          </h6>
          <div
            class="d-flex gap-2 overflow-x-auto pb-2"
            id="detProdImagesGrid"
            style="max-height: 220px"
          >
            <img
              :alt="selectedProduct?.name"
              :key="i"
              :src="img"
              class="rounded-3 border object-fit-cover shadow-sm"
              style="width: 140px; height: 140px; flex-shrink: 0"
              v-for="(img, i) in detailImages"
            />
          </div>
        </div>
        <div class="row g-3 mb-3">
          <div class="col-sm-4">
            <div class="p-3 bg-white rounded-3 border">
              <span class="text-xs text-muted d-block">Price</span>
              <strong
                class="fs-5 text-[var(--terracotta-2)]"
                id="detProdPrice"
                >{{
                  Number(selectedProduct?.price || 0).toFixed(2) + " JD"
                }}</strong
              >
            </div>
          </div>
          <div class="col-sm-4">
            <div class="p-3 bg-white rounded-3 border">
              <span class="text-xs text-muted d-block">Stock Available</span>
              <strong class="fs-5" id="detProdStock">{{
                selectedProduct?.stock
              }}</strong>
            </div>
          </div>
          <div class="col-sm-4">
            <div class="p-3 bg-white rounded-3 border">
              <span class="text-xs text-muted d-block">Category</span>
              <strong class="fs-6 text-dark" id="detProdCategory">{{
                selectedProduct?.category
              }}</strong>
            </div>
          </div>
        </div>
        <div class="p-3 bg-white rounded-3 border mb-3">
          <span class="text-xs text-muted d-block mb-1">Service Brief</span>
          <p class="mb-0 text-sm fw-medium text-dark" id="detProdSubtitle">
            {{ selectedProduct?.subtitle }}
          </p>
        </div>
        <div class="p-3 bg-white rounded-3 border mb-4">
          <span class="text-xs text-muted d-block mb-1">Item Details</span>
          <p class="mb-0 text-sm lh-base" id="detProdDesc">
            {{ selectedProduct?.description }}
          </p>
        </div>
        <div class="p-3 bg-white rounded-3 border mb-3">
          <span class="text-xs text-muted d-block mb-1">Dimensions</span>
          <p class="mb-0 text-sm">
            {{ selectedProduct?.dimensions || "Not provided" }}
          </p>
        </div>
        <div class="p-3 bg-white rounded-3 border mb-4">
          <span class="text-xs text-muted d-block mb-1">What's Included</span>
          <p
            class="mb-0 text-sm"
            style="white-space: pre-line; overflow-wrap: anywhere"
          >
            {{ selectedProduct?.whats_included || "Not provided" }}
          </p>
        </div>
        <div class="d-flex justify-content-between align-items-center">
          <button
            class="btn btn-outline-dark rounded-pill px-4 py-2 text-xs"
            @click="openStorefrontProduct()"
          >
            View in Storefront Page
          </button>
          <button
            @click="closeModal"
            class="btn btn-dark rounded-pill px-4 py-2 text-sm"
            type="button"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.admin-sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 40;
  width: 260px;
  border-right: 1px solid var(--border-2, #e8dfd7);
  background-color: var(--cream-4, #fbf9f6);
  padding: 2rem 1.5rem;
  transition: transform 0.3s ease;
}

@media (max-width: 991.98px) {
  .admin-sidebar {
    transform: translateX(-100%);
  }

  .admin-sidebar.show {
    transform: translateX(0);
  }
}

.admin-main {
  min-height: 100vh;
}

@media (min-width: 992px) {
  .admin-main {
    padding-left: 260px;
  }
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: var(--gray-warm, #786e68);
  text-align: left;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.nav-btn:hover {
  background-color: var(--cream-3, #f2ebe4);
  color: var(--dark, #2c2825);
}

.nav-btn.active {
  background-color: #f0e2d9;
  color: var(--terracotta-2, #bd6c59);
  font-weight: 600;
}

.settings-card {
  background: #fff;
  border: 1px solid var(--border-1, #e4dbd3);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  margin-bottom: 24px;
  transition: all 0.3s ease;
}

.settings-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
}

.order-status-select {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3csvg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 12px 12px;
  padding-right: 2rem;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.vue-modal {
  overflow-y: auto;
  background: transparent;
}
.vue-modal .modal-dialog {
  pointer-events: auto;
}
.monthly-earnings {
  margin: 20px 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.monthly-earnings strong {
  font-family: "Instrument Serif", Georgia, serif;
  font-size: 36px;
  color: var(--sage-text-2);
  line-height: 1.1;
}
.monthly-earnings span {
  font-size: 11px;
  color: var(--sage-text-2);
}
.order-status-select,
.order-status-select option {
  background-color: #fff !important;
  color: var(--dark) !important;
}

.notification-count {
  background: var(--terracotta-2);
  color: #fff;
  font-size: 11px;
  border-radius: 999px;
  padding: 2px 8px;
}
.notification-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px;
  background: #fff;
  border: 1px solid var(--border-1);
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  transition:
    background 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;
  width: 100%;
  color: var(--dark);
}
.notification-card:hover {
  border-color: var(--terracotta-2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
}
.notification-card.notification-unread {
  background: #fff7f2;
  border-color: #d9a18f;
  box-shadow:
    inset 4px 0 0 var(--terracotta-2),
    0 4px 12px rgba(189, 108, 89, 0.08);
}
.notification-message-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--cream-3);
  color: var(--terracotta-2);
  flex-shrink: 0;
}
.notification-copy {
  min-width: 0;
  flex: 1;
}
.notification-copy strong {
  font-size: 15px;
}
.notification-body {
  display: block;
  color: var(--gray-warm);
  font-size: 13px;
  line-height: 1.7;
  margin-top: 5px;
  overflow-wrap: anywhere;
}
.notification-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 7px;
  margin-left: auto;
  padding-top: 3px;
  flex-shrink: 0;
}

.notification-time {
  color: var(--gray-warm-2, #92766a);
  font-size: 11px;
  white-space: nowrap;
}

.notification-reference {
  padding: 4px 9px;
  border-radius: 7px;
  background: #f0e2d9;
  color: var(--terracotta-2, #bd6c59);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.unread-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--terracotta-2);
  flex-shrink: 0;
}
@media (max-width: 575px) {
  .notification-card {
    padding: 18px;
    gap: 12px;
    flex-wrap: wrap;
  }
  .notification-copy {
    flex-basis: calc(100% - 54px);
  }
  .notification-meta {
    margin-left: 54px;
    align-items: flex-start;
  }

  .notification-time {
    white-space: normal;
  }
}

.product-table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
}
.product-result-count {
  font-size: 12px;
  color: var(--gray-warm);
}
.product-result-count strong {
  color: var(--dark);
  font-weight: 600;
}
.compact-product-search {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 280px;
  max-width: 65%;
  padding: 10px 14px;
  border: 1px solid var(--border-1);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(44, 40, 37, 0.03);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}
.compact-product-search:focus-within {
  border-color: var(--terracotta-2);
  box-shadow: 0 0 0 3px rgba(189, 108, 89, 0.1);
}
.compact-product-search > i {
  font-size: 13px;
  color: var(--terracotta-2);
}
.compact-product-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--dark);
  font-size: 12px;
}
.compact-product-search input::placeholder {
  color: var(--gray-warm-2);
}
.compact-product-search input::-webkit-search-cancel-button {
  display: none;
}
.clear-product-search {
  border: 0;
  background: var(--cream-3);
  color: var(--gray-warm);
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}
@media (max-width: 575px) {
  .product-table-toolbar {
    gap: 10px;
  }
  .compact-product-search {
    width: 210px;
    padding: 9px 11px;
  }
  .product-result-count {
    font-size: 11px;
  }
}
.orders-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}

.orders-result-count {
  margin: 0;
  color: #6b7280;
  font-size: 12px;
}

.orders-toolbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.orders-search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 210px;
  min-height: 36px;
  padding: 0 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.orders-search-box:focus-within {
  border-color: #71927d;
  box-shadow: 0 0 0 3px rgb(113 146 125 / 12%);
}

.orders-search-box > i {
  color: #8b938d;
  font-size: 13px;
}

.orders-search-box input {
  width: 100%;
  min-width: 0;
  padding: 8px 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #26352b;
  font: inherit;
  font-size: 12px;
}

.orders-search-box input::placeholder {
  color: #929a95;
}

.orders-small-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  color: #37473d;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.orders-small-button:hover,
.orders-small-button.is-active {
  border-color: #b8cebf;
  background: #edf4ef;
}

.orders-small-button:focus-visible {
  outline: 2px solid #71927d;
  outline-offset: 2px;
}

.orders-add-button {
  border-color: #26352b;
  background: #26352b;
  color: #fff;
}

.orders-add-button:hover {
  border-color: #3a5142;
  background: #3a5142;
}

.orders-filter-control {
  position: relative;
}

.orders-filter-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #527c60;
}

.orders-filter-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 30;
  width: 180px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 24px rgb(0 0 0 / 8%);
}

.orders-filter-panel label {
  display: block;
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 11px;
}

.orders-filter-panel select {
  width: 100%;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #26352b;
  font: inherit;
  font-size: 12px;
}

@media (max-width: 575px) {
  .orders-toolbar-actions {
    width: 100%;
  }

  .orders-search-box {
    flex: 1 1 160px;
    width: auto;
  }
}

.product-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 20px;
}
.product-page-summary {
  color: var(--gray-warm, #786e68);
  font-size: 12px;
}
.product-page-buttons {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.product-page-button {
  min-width: 36px;
  min-height: 36px;
  padding: 8px 12px;
  border: 1px solid var(--border-1, #e4dbd3);
  border-radius: 10px;
  background: #fff;
  color: var(--dark, #2c2825);
  font-size: 12px;
  cursor: pointer;
}
.product-page-button:hover:not(:disabled) {
  border-color: var(--terracotta-2, #bd6c59);
  background: #fff7f2;
}
.product-page-button.is-current {
  border-color: var(--terracotta-2, #bd6c59);
  background: var(--terracotta-2, #bd6c59);
  color: #fff;
}
.product-page-button:disabled {
  opacity: 0.4;
  cursor: default;
}
.product-page-button:focus-visible {
  outline: 2px solid var(--terracotta-2, #bd6c59);
  outline-offset: 2px;
}
.product-image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.product-image-tile {
  position: relative;
  width: 90px;
  height: 90px;
  flex-shrink: 0;
}
.product-image-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: 1px solid #e4dbd3;
  border-radius: 12px;
}
.product-image-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #b94d42;
  color: #fff;
  font-size: 10px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgb(0 0 0 / 15%);
}
.product-image-remove:disabled {
  opacity: 0.5;
  cursor: default;
}
.product-image-remove:focus-visible {
  outline: 2px solid #263b32;
  outline-offset: 2px;
}
.product-image-badge {
  position: absolute;
  bottom: 5px;
  left: 5px;
  padding: 2px 6px;
  border-radius: 5px;
  background: #263b32;
  color: #fff;
  font-size: 10px;
}

.order-payment-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  font-style: normal;
}
.order-payment-badge.is-paid {
  background: #e8f5ed;
  color: #2e7148;
}
.order-payment-badge.is-pending {
  background: #fff3dd;
  color: #916419;
}
.order-payment-badge.is-unknown {
  background: #f0f1f3;
  color: #656b73;
}
.order-paypal-details {
  display: flex;
  flex: 1 1 100%;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
  padding: 12px 14px;
  border: 1px solid #dbe5f3;
  border-radius: 12px;
  background: #f6f9ff;
  color: #526078;
  font-size: 11px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.order-paypal-details strong {
  color: #003087;
  font-weight: 600;
}
.payment-confirm-icon { background: #e5efe8; color: #456d56; }
.payment-confirm-button { background: #456d56; border-color: #456d56; color: #fff; }
.payment-confirm-button:hover, .payment-confirm-button:focus-visible { background: #345440; border-color: #345440; color: #fff; }
.payment-confirm-button:focus-visible { box-shadow: 0 0 0 3px #456d5633; }
.order-payment-control { position: relative; width: max-content; max-width: 100%; margin: 8px 0 0 auto; text-align: left; }
.order-payment-trigger { display: flex; align-items: center; gap: 8px; list-style: none; cursor: pointer; padding: 7px 12px; border: 1px solid #dfd1c5; border-radius: 999px; background: #f6eee7; color: #80604a; font-size: 12px; font-weight: 500; }
.order-payment-trigger::-webkit-details-marker { display: none; }
.order-payment-trigger:hover, .order-payment-control[open] .order-payment-trigger { background: #efe2d7; border-color: #c8ae99; }
.order-payment-trigger:focus-visible, .payment-option:focus-visible { outline: 2px solid #648272; outline-offset: 3px; }
.order-payment-trigger[aria-disabled="true"] { opacity: 0.6; cursor: wait; }
.payment-chevron { font-size: 10px; transition: transform 0.2s; }
.order-payment-control[open] .payment-chevron { transform: rotate(180deg); }
.order-payment-options { position: absolute; right: 0; top: calc(100% + 8px); z-index: 25; width: 230px; max-width: calc(100vw - 48px); padding: 8px; border: 1px solid #e4dbd3; border-radius: 14px; background: #fffdfa; box-shadow: 0 10px 28px rgb(44 40 37 / 12%); }
.payment-options-label { margin: 5px 8px 8px; font-size: 9px; letter-spacing: 0.12em; font-weight: 600; color: #92766a; }
.payment-option { display: flex; align-items: center; gap: 9px; width: 100%; padding: 11px 10px; border: 0; border-radius: 9px; background: transparent; color: #786e68; font: inherit; font-size: 12px; text-align: left; cursor: pointer; }
.payment-option.is-current { background: #f3e9e0; color: #80604a; }
.payment-option:hover { background: #eee2d6; }
.payment-option-paid { margin-top: 4px; color: #456d56; }
.payment-option-paid:hover { background: #e5efe8; }
.payment-option:disabled { opacity: 0.6; cursor: wait; }
/* Compact admin layouts. All rules stay inside this component. */
.admin-main, .admin-main > section, .admin-tab-content {
  min-width: 0;
}
.admin-sidebar {
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-bottom: max(24px, env(safe-area-inset-bottom));
}
.admin-main .row > *, .vue-modal .row > * {
  min-width: 0;
}
.admin-main button, .vue-modal button {
  touch-action: manipulation;
}
.admin-main .badge {
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.5;
}
.order-contact-info > span, #currentPartnersList > div > div {
  min-width: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 991.98px) {
  .admin-sidebar {
    width: min(280px, calc(100vw - 48px));
    padding: 24px 18px max(24px, env(safe-area-inset-bottom));
  }
  .admin-sidebar > button {
    margin-bottom: 24px !important;
  }
  .nav-btn {
    min-height: 44px;
    padding: 11px 12px;
    font-size: 13px;
  }
  .admin-main > header {
    flex-wrap: wrap;
    gap: 12px;
    padding: 16px 20px !important;
  }
  .admin-heading, .admin-header-actions {
    min-width: 0;
    gap: 10px !important;
  }
  .admin-heading { flex: 1 1 220px; }
  #pageTitle {
    font-size: 24px !important;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }
  .admin-header-actions { flex-wrap: wrap; }
  .admin-header-actions > button {
    min-height: 44px;
    padding: 10px 14px !important;
    font-size: 12px;
  }
  .admin-main > section { padding: 20px !important; }
  .settings-card {
    padding: 20px;
    border-radius: 16px;
    margin-bottom: 18px;
  }
  .admin-main .row.g-4 {
    --bs-gutter-x: 16px;
    --bs-gutter-y: 16px;
  }
  .admin-main .btn, .vue-modal .btn {
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
  }
  .orders-small-button, .product-page-button {
    min-height: 44px;
  }
  .product-page-button { min-width: 44px; }
  .vue-modal .modal-dialog {
    width: auto;
    max-width: 680px;
    margin: 16px auto;
    padding-inline: 12px;
  }
  .vue-modal .modal-content {
    padding: 20px !important;
    border-radius: 18px !important;
  }
  .vue-modal .btn-close {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    padding: 10px;
    background-size: 12px;
  }
}

@media (max-width: 575.98px) {
  .admin-main { font-size: 13px; }
  .admin-main > header {
    padding: 14px 16px !important;
    gap: 10px;
  }
  .admin-heading { flex-basis: 100%; }
  .admin-heading > button {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
  }
  #pageTitle { font-size: 23px !important; }
  .admin-header-actions {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    width: 100%;
    gap: 8px !important;
  }
  .admin-main > section { padding: 16px 12px 28px !important; }
  .admin-main .text-sm, .vue-modal .text-sm { font-size: 13px; }
  .admin-main .text-xs, .vue-modal .text-xs { font-size: 12px; }
  .admin-main .fs-1 { font-size: 30px !important; }
  .admin-main .fs-2 { font-size: 29px !important; }
  .admin-main .fs-3 { font-size: 25px !important; }
  .admin-main .fs-4, .vue-modal .fs-3, .vue-modal .fs-4 {
    font-size: 21px !important;
    line-height: 1.25;
  }
  .admin-main .fs-5, .vue-modal .fs-5 { font-size: 18px !important; }
  .settings-card { padding: 16px; border-radius: 14px; margin-bottom: 16px; }
  .admin-main .settings-card.mb-0 { margin-bottom: 0; }
  .admin-main .mb-4 { margin-bottom: 16px !important; }
  .admin-main .mt-4 { margin-top: 16px !important; }
  .admin-main .gap-3 { gap: 10px !important; }
  .admin-main .p-4 { padding: 16px !important; }
  .admin-main .icon-box-40 { width: 34px; height: 34px; flex-shrink: 0; }
  .monthly-earnings { margin: 14px 0; align-items: flex-start; }
  .monthly-earnings strong { font-size: 30px; }
  .monthly-earnings span { font-size: 12px; }
  #latestProductsList img { width: 44px !important; height: 44px !important; }
  #latestProductsList strong { flex-shrink: 0; white-space: nowrap; }
  .product-table-toolbar { flex-direction: column; align-items: stretch; gap: 10px; }
  .compact-product-search { width: 100%; max-width: 100%; min-height: 44px; padding: 9px 12px; }
  .clear-product-search { width: 30px; height: 30px; }
  #tab-creations .table-responsive { padding: 0 !important; }
  #tab-creations table { min-width: 540px; }
  #tab-creations th, #tab-creations td { padding: 12px !important; }
  #tab-creations td .btn {
    min-width: 40px;
    min-height: 40px;
    margin: 2px !important;
  }
  #tab-creations td:last-child { min-width: 160px; }
  .product-pagination { gap: 10px; margin-top: 14px; }
  .product-page-buttons { gap: 5px; width: 100%; }
  .product-page-button { padding: 8px 10px; }
  .orders-toolbar { gap: 10px; margin-bottom: 16px; }
  .orders-toolbar-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    width: 100%;
  }
  .orders-search-box { grid-column: 1 / -1; width: 100%; min-height: 44px; }
  .orders-filter-control > button { width: 100%; }
  .orders-filter-panel { left: 0; right: auto; width: min(230px, calc(100vw - 56px)); }
  .order-card-heading { align-items: flex-start !important; }
  .order-card-heading > div:first-child { flex: 1 1 140px; min-width: 0; }
  .order-card-heading > div:first-child > span { overflow-wrap: anywhere; }
  .order-card-heading > .text-end { flex: 1 1 140px; min-width: 0; }
  .order-card-heading h5 { font-size: 28px; line-height: 1.1; }
  .order-contact-info { gap: 8px !important; font-size: 12px !important; }
  .order-contact-info > span { flex: 1 1 100%; }
  .order-status-select { min-height: 40px; height: auto !important; max-width: 100%; }
  .order-payment-trigger { min-height: 40px; padding: 8px 10px; }
  .order-payment-options { max-width: calc(100vw - 56px); }
  .order-paypal-details { padding: 10px; font-size: 12px; }
  .order-card-footer > .d-flex:last-child { width: 100%; justify-content: flex-end; }
  .notification-card { display: grid; grid-template-columns: 34px minmax(0, 1fr); padding: 16px; gap: 10px; border-radius: 14px; }
  .notification-message-icon { width: 34px; height: 34px; border-radius: 10px; }
  .notification-copy { min-width: 0; }
  .notification-copy strong { font-size: 14px; overflow-wrap: anywhere; }
  .notification-copy > span:first-child { flex-wrap: wrap; }
  .notification-body { font-size: 12px; line-height: 1.65; }
  .notification-meta {
    grid-column: 2;
    min-width: 0;
    margin: 0;
    padding: 0;
    align-items: flex-start;
    gap: 5px;
  }
  .notification-time, .notification-reference { white-space: normal; overflow-wrap: anywhere; }
  #tab-notifications > div:first-child > button { width: 100%; }
  #tab-settings .settings-card > .d-flex:first-child { align-items: flex-start !important; flex-wrap: wrap; gap: 10px; }
  #tab-settings .settings-card > .d-flex:first-child > div { min-width: 0; flex: 1 1 180px; }
  #tab-settings .settings-card > .d-flex:first-child > button { margin-left: auto; padding: 8px 12px !important; }
  #currentPartnersList > div { flex-wrap: wrap; gap: 10px !important; }
  #currentPartnersList > div > div { flex-basis: calc(100% - 60px); }
  #currentPartnersList > div > button { margin-left: auto; }
  #tab-impact .form-select { max-width: 100%; }
  #tab-impact .settings-card > .d-flex { flex-wrap: wrap; gap: 12px; }
  #tab-impact .settings-card > .d-flex > div { min-width: 0; }
  #monthSalesDetails .d-flex { flex-wrap: wrap; gap: 5px; }
  #monthSalesDetails .d-flex > span { overflow-wrap: anywhere; }
  .vue-modal .modal-dialog {
    margin: 8px auto;
    padding-inline: 8px;
    min-height: calc(100% - 16px);
  }
  .vue-modal .modal-content { padding: 16px !important; border-radius: 16px !important; min-width: 0; }
  .vue-modal .modal-content > .d-flex:first-child { gap: 10px; }
  .vue-modal .form-label { font-size: 12px; margin-bottom: 6px; }
  /* Keep editable controls at 16px to prevent iOS focus zoom. */
  .admin-main input, .admin-main textarea, .admin-main select,
  .vue-modal input, .vue-modal textarea, .vue-modal select {
    font-size: 16px !important;
    min-height: 44px;
    max-width: 100%;
  }
  .vue-modal textarea { min-height: 100px; }
  .vue-modal .btn { min-height: 44px; padding: 9px 12px !important; font-size: 12px; }
  .vue-modal .mt-4 { margin-top: 16px !important; }
  .vue-modal .mb-4 { margin-bottom: 16px !important; }
  .vue-modal .input-group { min-width: 0; }
  .vue-modal .input-group > .form-control { min-width: 0; overflow-wrap: anywhere; }
  .product-image-grid { gap: 12px; padding: 6px 4px; }
  .product-image-tile { width: 76px; height: 76px; }
  .product-image-remove { width: 32px; height: 32px; right: -7px; top: -7px; }
  #detProdImagesGrid { max-height: 150px !important; }
  #detProdImagesGrid img { width: 110px !important; height: 110px !important; }
  #productDetailsModal .modal-content > .d-flex:last-child { flex-wrap: wrap; gap: 8px; }
  #productDetailsModal .modal-content > .d-flex:last-child > button { flex: 1 1 140px; }
}

@media (max-width: 359.98px) {
  .admin-main > section { padding-inline: 10px !important; }
  .settings-card { padding: 14px; }
  .vue-modal .row > .col-6 { flex: 0 0 100%; width: 100%; }
  .order-card-heading > .text-end { text-align: left !important; }
  .order-payment-control { margin-left: 0; }
  .order-payment-options { left: 0; right: auto; }
}

</style>
