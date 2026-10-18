const backendUrl = (
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"
).trim().replace(/\/+$/, "");

function createError(message, status = 0, errors = {}) {
  const error = new Error(message);

  error.status = status;
  error.errors = errors;

  return error;
}

function csrfToken() {
  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("XSRF-TOKEN="));

  if (!cookie) {
    return "";
  }

  try {
    return decodeURIComponent(
      cookie.substring("XSRF-TOKEN=".length),
    );
  } catch {
    return "";
  }
}

// استخدام رسائل ثابتة بدل عرض تفاصيل السيرفر أو دمج أخطاء الحقول.
function validationMessage(field) {
  const key = String(field).toLowerCase();

  if (/quote|expected_total/.test(key)) {
    return "Your checkout details have changed or expired. Please refresh checkout.";
  }

  if (/checkout_token|^token$/.test(key)) {
    return "This link or checkout session is no longer valid. Please start again.";
  }

  if (/current_password/.test(key)) {
    return "Please check your current password.";
  }

  if (/password_confirmation/.test(key)) {
    return "Please make sure your passwords match.";
  }

  if (/password/.test(key)) {
    return "Please check your password and its confirmation.";
  }

  if (/email/.test(key)) {
    return "Please check the email address you entered.";
  }

  if (/phone/.test(key)) {
    return "Please enter a valid phone number.";
  }

  if (/payment_status/.test(key)) {
    return "This payment status cannot be changed.";
  }

  if (/payment_method/.test(key)) {
    return "Please select an available payment method.";
  }

  if (/image|retained_images/.test(key)) {
    return "Please check your images. Use JPG, PNG, or WebP files up to 4 MB each, with no more than 10 product images.";
  }

  if (/^items(?:\.|$)/.test(key)) {
    return "Please check the selected products, quantities, prices, and available stock.";
  }

  if (/stock|quantity|qty/.test(key)) {
    return "Please check the quantity and available stock.";
  }

  if (/price|total|subtotal/.test(key)) {
    return "Please check the price or refresh checkout.";
  }

  if (/address|city|location/.test(key)) {
    return "Please check the address and location.";
  }

  if (/url|instagram|facebook/.test(key)) {
    return "Please enter a valid website address.";
  }

  if (/status/.test(key)) {
    return "This order status cannot be changed.";
  }

  if (/category/.test(key)) {
    return "Please select a valid category.";
  }

  if (/name|company|contact/.test(key)) {
    return "Please check the name or contact details.";
  }

  if (/details|description|subtitle/.test(key)) {
    return "Please check the details you entered.";
  }

  return "Please check the information you entered and try again.";
}

function safeValidationErrors(errors) {
  if (
    !errors ||
    typeof errors !== "object" ||
    Array.isArray(errors)
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.keys(errors)
      .filter((field) => /^[a-zA-Z0-9_.-]{1,100}$/.test(field))
      .slice(0, 30)
      .map((field) => [field, [validationMessage(field)]]),
  );
}

function failureMessage(status, path, errors = {}) {
  const paypal = String(path).startsWith("/api/paypal/");
  const login = path === "/admin/login";

  if (status === 401) {
    return login
      ? "The email or password is incorrect."
      : "Please sign in to continue.";
  }

  if (status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (status === 419) {
    return "Your session has expired. Please reload the page and try again.";
  }

  if (status === 422) {
    if (login) {
      return "Please check your email and password.";
    }

    return (
      Object.values(errors)[0]?.[0] ||
      "Please check the information you entered and try again."
    );
  }

  if (status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (status === 404) {
    return "The requested item or page is no longer available.";
  }

  if (status === 409 || status === 410) {
    return paypal
      ? "Your checkout needs to be refreshed. Check your payment status before starting another payment."
      : "This information has changed or expired. Please refresh the page.";
  }

  if (paypal) {
    return "We could not confirm your payment status. Please check your order or contact us before trying another payment.";
  }

  return "Something went wrong. Please try again later.";
}

export async function backendRequest(
  path,
  { method = "GET", body } = {},
) {
  const requestMethod = method.toUpperCase();

  const headers = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  const token = csrfToken();

  if (token) {
    headers["X-XSRF-TOKEN"] = token;
  }

  const isFormData = body instanceof FormData;
  const canSendBody = !["GET", "HEAD"].includes(requestMethod);

  if (
    canSendBody &&
    body !== undefined &&
    !isFormData
  ) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  let text;

  try {
    response = await fetch(`${backendUrl}${path}`, {
      method: requestMethod,
      headers,
      credentials: "include",
      body:
        !canSendBody || body === undefined
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body),
    });

    text = await response.text();
  } catch {
    // انقطاع الاتصال لا يعني بالضرورة فشل إنشاء الطلب أو تنفيذ الدفع.
    const message = String(path).startsWith("/api/paypal/")
      ? "Unable to confirm the payment status. Please check your order or contact us before trying another payment."
      : path === "/api/orders" && requestMethod === "POST"
        ? "We could not confirm your order. Please contact us before placing it again."
        : "Unable to connect. Please check your internet connection and try again.";

    throw createError(message);
  }

  let result = {};

  if (text.trim()) {
    try {
      result = JSON.parse(text);
    } catch {
      throw createError(
        failureMessage(response.status, path),
        response.status,
      );
    }

    if (
      result === null ||
      typeof result !== "object" ||
      Array.isArray(result)
    ) {
      throw createError(
        failureMessage(response.status, path),
        response.status,
      );
    }
  }

  if (!response.ok) {
    const errors =
      response.status === 422
        ? safeValidationErrors(result.errors)
        : {};

    throw createError(
      failureMessage(response.status, path, errors),
      response.status,
      errors,
    );
  }

  return result;
}

export async function initializeCsrf() {
  await backendRequest("/sanctum/csrf-cookie");

  if (!csrfToken()) {
    throw createError(
      "Unable to start a secure session. Please allow site cookies and reload the page.",
      419,
    );
  }
}

export async function checkSession() {
  try {
    const result = await backendRequest("/admin/me");

    return Number(result.user?.is_admin) === 1;
  } catch (error) {
    if (
      error.status === 401 ||
      error.status === 403
    ) {
      return false;
    }

    throw error;
  }
}

export async function authRequest(action, body = {}) {
  const routes = {
    login: "/admin/login",
    logout: "/admin/logout",
    "forgot-password": "/admin/forgot-password",
    "reset-password": "/admin/reset-password",
    "change-password": "/api/admin/settings/password",
  };

  if (
    !Object.prototype.hasOwnProperty.call(routes, action)
  ) {
    throw createError(
      "This action is unavailable. Please reload the page.",
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw createError(
      "Please check the information you entered and try again.",
    );
  }

  await initializeCsrf();

  let method = "POST";
  let payload;

  switch (action) {
    case "login":
      payload = {
        email: String(body.email || "").trim(),
        password: body.password,
      };
      break;

    case "forgot-password":
      payload = {
        email: String(body.email || "").trim(),
      };
      break;

    case "reset-password":
      payload = {
        email: String(body.email || "").trim(),
        token: body.token,
        password: body.password,
        password_confirmation:
          body.password_confirmation ??
          body.confirm ??
          body.password,
      };
      break;

    case "change-password":
      method = "PUT";

      payload = {
        current_password:
          body.current_password ?? body.current,
        password: body.password,
        password_confirmation:
          body.password_confirmation ??
          body.confirm ??
          body.password,
      };
      break;

    case "logout":
      payload = {};
      break;
  }

  const result = await backendRequest(routes[action], {
    method,
    body: payload,
  });

  if (action === "login") {
    if (Number(result.user?.is_admin) !== 1) {
      throw createError(
        "Unable to sign in to the admin area.",
        403,
      );
    }

    return {
      ...result,
      authenticated: true,
    };
  }

  return result;
}