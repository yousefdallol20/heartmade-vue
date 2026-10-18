<script setup>
import { reactive, ref } from "vue";
import { useNavigation } from "../composables/navigation.js";
import {
  backendRequest,
  initializeCsrf,
} from "../stores/auth.js";

const { navigate } = useNavigation();

const success = ref(false);
const submitting = ref(false);
const errorMessage = ref("");
const reference = ref("");

const form = reactive({
  company: "",
  contact: "",
  email: "",
  phone: "",
  quantity: "20-50 items",
  details: "",
});

async function submitInquiry() {
  if (submitting.value) {
    return;
  }

  errorMessage.value = "";

  const payload = {
    company: form.company.trim(),
    contact: form.contact.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    quantity: form.quantity,
    details: form.details.trim(),
  };

  if (
    ![
      payload.company,
      payload.contact,
      payload.email,
      payload.phone,
      payload.details,
    ].every(Boolean)
  ) {
    errorMessage.value = "Please fill in all required fields.";
    return;
  }

  submitting.value = true;

  try {
    await initializeCsrf();

    const result = await backendRequest("/api/inquiries", {
      method: "POST",
      body: payload,
    });

    if (result.success !== true) {
      throw new Error(
        "The server did not confirm your submission."
      );
    }

    reference.value = result.reference ?? "";
    success.value = true;
  } catch (error) {
    errorMessage.value =
      error.status === 429
        ? "Too many submissions. Please wait a minute and try again."
        : error.message ||
          "Could not submit your inquiry. Please try again.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="product-main">
    <div class="container-lg2">
      <div class="b2b-hero">
        <div class="b2b-badge">
          <i class="bi bi-building" aria-hidden="true"></i>
          Corporate Partnerships &amp; B2B
        </div>

        <h1>Gifts with a <em>Purpose</em></h1>

        <p>
          Partner with Heart Made for meaningful corporate gifts,
          customized products, and orders that bring joy and create
          real social impact.
        </p>
      </div>

      <div class="b2b-features">
        <div class="b2b-feature-card">
          <div
            class="b2b-feature-icon"
            style="background: #f7e8e4; color: #cf715d"
          >
            <i
              class="bi bi-box-seam icon-size-22"
              aria-hidden="true"
            ></i>
          </div>

          <h3>Custom Branding</h3>

          <p>
            Add your company logo, brand identity, or a personalized
            message to create meaningful gifts tailored to your team,
            clients, or special occasions.
          </p>
        </div>

        <div class="b2b-feature-card">
          <div
            class="b2b-feature-icon"
            style="
              background: var(--sage-bg);
              color: var(--sage-text);
            "
          >
            <i
              class="bi bi-people icon-size-22"
              aria-hidden="true"
            ></i>
          </div>

          <h3>Direct Social Impact</h3>

          <p>
            Every purchase creates meaningful work opportunities
            for young adults with developmental disabilities.
          </p>
        </div>

        <div class="b2b-feature-card">
          <div
            class="b2b-feature-icon"
            style="
              background: var(--gold-bg);
              color: var(--gold-text);
            "
          >
            <i
              class="bi bi-stars icon-size-22"
              aria-hidden="true"
            ></i>
          </div>

          <h3>High Quality</h3>

          <p>
            Thoughtfully designed and carefully made products,
            created with attention to detail and quality, from
            stationery and printed products to gifts, accessories,
            and more.
          </p>
        </div>
      </div>

      <div class="b2b-form-wrap">
        <div
          v-if="success"
          id="b2bSuccess"
          class="b2b-success"
          role="status"
        >
          <div class="check-circle">
            <i
              class="bi bi-check-circle"
              style="font-size: 40px"
              aria-hidden="true"
            ></i>
          </div>

          <h2>Inquiry Received!</h2>

          <p>
            Your inquiry has been received successfully.
            Our team will review your request and contact you.
          </p>

          <p v-if="reference" class="inquiry-reference">
            <strong>Reference: {{ reference }}</strong>
          </p>

          <button
            class="btn-dark-pill"
            style="margin-top: 32px"
            type="button"
            @click="navigate('index.html')"
          >
            Return to Storefront
          </button>
        </div>

        <div v-else id="b2bFormWrap">
          <h2>Gifts that mean more</h2>

          <p>
            Interested in corporate gifts, customized products,
            or a special order from Heart Made? Tell us what you
            have in mind, and our team will get in touch to explore
            how we can create something meaningful together.
          </p>

          <form
            id="b2bForm"
            :aria-busy="submitting"
            @submit.prevent="submitInquiry"
          >
            <p
              v-if="errorMessage"
              class="inquiry-error"
              role="alert"
            >
              {{ errorMessage }}
            </p>

            <fieldset
              class="inquiry-fields"
              :disabled="submitting"
            >
              <legend class="inquiry-sr-only">
                Corporate inquiry details
              </legend>

              <div class="form-row2">
                <div class="form-group margin-bottom-none">
                  <label
                    for="corporateview-field-1"
                    class="form-label"
                  >
                    Company / Organization *
                  </label>

                  <input
                    id="corporateview-field-1"
                    v-model="form.company"
                    class="form-control-custom"
                    name="company"
                    type="text"
                    placeholder="e.g. Acme Corp"
                    autocomplete="organization"
                    maxlength="255"
                    required
                  />
                </div>

                <div class="form-group margin-bottom-none">
                  <label
                    for="corporateview-field-2"
                    class="form-label"
                  >
                    Contact Person *
                  </label>

                  <input
                    id="corporateview-field-2"
                    v-model="form.contact"
                    class="form-control-custom"
                    name="contact"
                    type="text"
                    placeholder="Your Full Name"
                    autocomplete="name"
                    maxlength="255"
                    required
                  />
                </div>
              </div>

              <div class="form-row2 margin-top-20">
                <div class="form-group margin-bottom-none">
                  <label
                    for="corporateview-field-3"
                    class="form-label"
                  >
                    Work Email *
                  </label>

                  <input
                    id="corporateview-field-3"
                    v-model="form.email"
                    class="form-control-custom"
                    name="email"
                    type="email"
                    placeholder="name@company.com"
                    autocomplete="email"
                    maxlength="255"
                    required
                  />
                </div>

                <div class="form-group margin-bottom-none">
                  <label
                    for="corporateview-field-4"
                    class="form-label"
                  >
                    Phone Number *
                  </label>

                  <input
                    id="corporateview-field-4"
                    v-model="form.phone"
                    class="form-control-custom"
                    name="phone"
                    type="tel"
                    placeholder="+962 7X XXX XXXX"
                    autocomplete="tel"
                    maxlength="40"
                    required
                  />
                </div>
              </div>

              <div class="form-group margin-top-20">
                <label
                  for="corporateview-field-5"
                  class="form-label"
                >
                  Estimated Quantity *
                </label>

                <select
                  id="corporateview-field-5"
                  v-model="form.quantity"
                  class="form-control-custom"
                  name="quantity"
                  required
                >
                  <option value="20-50 items">
                    20–50 items
                  </option>

                  <option value="50-100 items">
                    50–100 items
                  </option>

                  <option value="100-300 items">
                    100–300 items
                  </option>

                  <option value="300+ items">
                    300+ items
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label
                  for="corporateview-field-6"
                  class="form-label"
                >
                  Order / Customization Details *
                </label>

                <textarea
                  id="corporateview-field-6"
                  v-model="form.details"
                  class="form-control-custom"
                  name="details"
                  placeholder="Tell us about your event, delivery timeline, or branding requirements..."
                  rows="4"
                  maxlength="10000"
                  required
                ></textarea>
              </div>

              <button
                class="b2b-submit-btn"
                type="submit"
                :disabled="submitting"
              >
                <span>
                  {{
                    submitting
                      ? "Submitting..."
                      : "Submit Inquiry"
                  }}
                </span>

                <i
                  :class="
                    submitting
                      ? 'bi bi-hourglass-split'
                      : 'bi bi-send'
                  "
                  aria-hidden="true"
                ></i>
              </button>
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.inquiry-fields {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.inquiry-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.inquiry-error {
  margin: 0 0 20px;
  padding: 12px 16px;
  border: 1px solid #ecc8c1;
  border-radius: 10px;
  background: #fff3f0;
  color: #963f32;
  font-size: 14px;
  line-height: 1.6;
}

.inquiry-reference {
  margin-top: 16px;
  overflow-wrap: anywhere;
}

.b2b-submit-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}
</style>