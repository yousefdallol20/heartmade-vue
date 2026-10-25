<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useNavigation } from "../composables/navigation.js";
import ProductCard from "../components/ProductCard.vue";
import { products } from "../stores/shop.js";
import { categories } from "../data/catalog.js";
import zone01 from "../assets/images/1.png";
import zone02 from "../assets/images/2.png";
import zone03 from "../assets/images/3.png";
import zone04 from "../assets/images/4.png";
import zone05 from "../assets/images/5.png";
import zone06 from "../assets/images/6.png";
import zone07 from "../assets/images/7.png";
import zone08 from "../assets/images/8.png";
import zone09 from "../assets/images/9.png";
import zone10 from "../assets/images/10.png";
import heroImage from "../assets/images/hero-section-01.png";
import studioImage from "../assets/images/studio-section-02.png";
import corporateImage from "../assets/images/corporates-03.png";

const { navigate } = useNavigation();

const partners = ref([]);
const partnersError = ref("");
const partnersLoading = ref(true);

const openPartner = ref("");
const copiedPartnerField = ref("");
const partnerCopyError = ref("");

let copyTimer;

const backendUrl = (
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"
).replace(/\/+$/, "");

function partnerHref(value) {
  const link = String(value || "").trim();

  if (!link) return null;

  // تحويل البريد إلى رابط مراسلة
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(link)) {
    return `mailto:${link}`;
  }

  try {
    const url = new URL(link);

    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

const partnerSlides = computed(() => {
  const items = partners.value.filter((partner) => partner.image);

  if (!items.length) return [];

  // تكرار الصور لضمان حركة الشريط
  const repetitions = Math.max(1, Math.ceil(8 / items.length));

  return Array.from({ length: repetitions }, (_, repetition) =>
    items.map((partner) => ({
      ...partner,
      href: partnerHref(partner.url),
      slideKey: `${partner.id}-${repetition}`,
    })),
  ).flat();
});

function togglePartner(key) {
  openPartner.value = openPartner.value === key ? "" : key;
  partnerCopyError.value = "";
}

function closePartner() {
  openPartner.value = "";
}

function handleOutsidePointer(event) {
  if (
    event.target instanceof Element &&
    !event.target.closest(".partner-item.is-open")
  ) {
    closePartner();
  }
}

function handleEscape(event) {
  if (event.key === "Escape") {
    closePartner();

    // إزالة التركيز عند إغلاق البوكس بلوحة المفاتيح
    const element = document.activeElement;

    if (element instanceof HTMLElement && element.closest(".partner-item")) {
      element.blur();
    }
  }
}

function handleViewportChange() {
  // إغلاق الحالة المفتوحة عند تغيير حجم الشاشة
  closePartner();
}

async function copyPartnerText(value, key) {
  partnerCopyError.value = "";

  try {
    if (!navigator.clipboard) {
      throw new Error("Clipboard is unavailable.");
    }

    await navigator.clipboard.writeText(String(value || ""));
    copiedPartnerField.value = key;

    clearTimeout(copyTimer);

    copyTimer = setTimeout(() => {
      copiedPartnerField.value = "";
    }, 1800);
  } catch {
    partnerCopyError.value = "Could not copy. Please try again.";
  }
}

onMounted(async () => {
  document.addEventListener("pointerdown", handleOutsidePointer);
  document.addEventListener("keydown", handleEscape);
  window.addEventListener("resize", handleViewportChange);

  try {
    const response = await fetch(`${backendUrl}/api/home`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Could not load partnerships.");
    }

    const result = await response.json();

    if (!Array.isArray(result.data?.partners)) {
      throw new Error("Invalid partnerships response.");
    }

    partners.value = result.data.partners;
  } catch (error) {
    partnersError.value = error.message || "Could not load partnerships.";
  } finally {
    partnersLoading.value = false;
  }
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", handleOutsidePointer);
  document.removeEventListener("keydown", handleEscape);
  window.removeEventListener("resize", handleViewportChange);
  clearTimeout(copyTimer);
});

const gallery = [
  { src: zone01, alt: "Heart Made artist drawing colorful hearts" },
  { src: zone02, alt: "Heart Made artist working at the craft table" },
  { src: zone03, alt: "Group art session inside Heart Made Zone" },
  { src: zone04, alt: "Heart Made artist creating a colorful craft" },
  { src: zone05, alt: "Collaborative craft activity at Heart Made Zone" },
  { src: zone06, alt: "Heart Made team working together around the table" },
  { src: zone07, alt: "Heart Made artist viewing a colorful drawing" },
  { src: zone08, alt: "Heart Made artist smiling in the studio" },
  { src: zone09, alt: "Heart Made artist holding a blue artwork" },
  { src: zone10, alt: "Heart Made artist adding details to an artwork" },
];

function scrollWorkshop(direction) {
  document.getElementById("workshopSlider")?.scrollBy({
    left: direction === "right" ? 250 : -250,
    behavior: "smooth",
  });
}
</script>

<template>
  <main>
    <section class="hero-section">
      <div class="hero-bg">
        <img :src="heroImage" alt="Heart Made artist painting in the studio" />
      </div>

      <div class="hero-content">
        <h1>Small Creations Made with <span class="accent">Big Heart</span></h1>

        <p class="lead">
          Discover a warm corner where young adults with special needs turn
          their artwork into meaningful products that spread joy.
        </p>

        <div class="hero-cta">
          <button
            class="btn-primary-solid"
            @click="navigate('catalog.html')"
            type="button"
          >
            Explore the Collection
          </button>

          <button
            class="btn-outline-cream"
            @click="navigate('story.html')"
            type="button"
          >
            Our Story
          </button>
        </div>
      </div>

      <div class="scroll-hint">SCROLL TO EXPLORE</div>
    </section>

    <section class="story-section" id="story" style="scroll-margin-top: 80px">
      <div class="story-media">
        <div class="story-tag">A studio with a big heart</div>

        <img
          :src="studioImage"
          alt="Heart Made artists painting together in the studio"
          class="main-img"
          decoding="async"
          loading="lazy"
        />
      </div>

      <div class="story-text">
        <p class="eyebrow">The Heart Made Way</p>
        <h2>A Small Creative Studio with a <em>Big Heart</em></h2>

        <p>
          Heart Made Zone is a vibrant, creative social enterprise based in
          Amman, where young adults with developmental disabilities explore
          their talents and bring their creativity to the world.
        </p>

        <p>
          Every piece is thoughtfully designed and crafted by hand and heart.
          From the first sketch to the finishing touches, our Heart Workers
          create with pride, patience and joy.
        </p>

        <p>
          When you choose a Heart Made product, you recognise the value of
          their work and help create opportunities for them to earn, grow and
          build greater independence.
        </p>

        <button
          class="story-link"
          @click="navigate('story.html')"
          type="button"
        >
          Meet the makers <i class="bi bi-arrow-up-right"></i>
        </button>
      </div>
    </section>

    <section class="shop-section" id="shop" style="scroll-margin-top: 64px">
      <template v-if="products.length">
        <div class="shop-head">
          <div>
            <p class="eyebrow">Featured Showcase</p>
            <h2>Good things, <em>made</em> well.</h2>
          </div>

          <div class="shop-head-right">
            <p>
              Genuinely made and thoughtdully designed products to spread joy
            </p>
          </div>
        </div>

        <div class="chip-row no-scrollbar" id="homeChips">
          <button
            v-for="c in categories"
            :key="c"
            :class="{ active: c === 'All' }"
            @click="navigate('catalog.html?category=' + encodeURIComponent(c))"
            class="chip"
            type="button"
          >
            {{ c }}
          </button>
        </div>

        <div class="product-grid" id="homeProductGrid">
          <ProductCard
            v-for="p in products.slice(0, 4)"
            :key="p.id"
            :product="p"
          />
        </div>

        <div class="shop-more">
          <button
            class="btn-outline-dark-pill"
            @click="navigate('catalog.html')"
            type="button"
          >
            View Full Catalog <i class="bi bi-arrow-up-right"></i>
          </button>
        </div>
      </template>

      <div v-else class="products-empty" role="status">
        <i class="bi bi-bag-heart" aria-hidden="true"></i>
        <p>No products have been added at this time.</p>
      </div>
    </section>

    <section class="workshop-section" id="impact">
      <div class="workshop-head">
        <div>
          <p class="eyebrow" style="margin-bottom: 2px">Behind the scenes</p>
          <h2>Inside Heart Made Zone</h2>
        </div>

        <div class="workshop-nav">
          <button
            aria-label="Previous image"
            class="round-nav-btn"
            @click="scrollWorkshop('left')"
            type="button"
          >
            <i class="bi bi-chevron-left"></i>
          </button>

          <button
            aria-label="Next image"
            class="round-nav-btn"
            @click="scrollWorkshop('right')"
            type="button"
          >
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>

      <div class="workshop-slider no-scrollbar" id="workshopSlider">
        <div v-for="(g, i) in gallery" :key="i" class="workshop-item">
          <img :alt="g.alt" :src="g.src" decoding="async" loading="lazy" />
        </div>
      </div>
    </section>

    <section class="corp-banner-wrap" id="corporate">
      <div class="corp-banner">
        <div>
          <p class="eyebrow-white">For thoughtful teams</p>
          <h2>Gifts that give back in more ways than one.</h2>

          <p class="desc">
            Bring your team, clients, or community a gift with a story. Our
            corporate gifting experiences are made with care, packed with
            purpose, and tailored to you.
          </p>

          <button class="btn-white" @click="navigate('b2b.html')" type="button">
            Start a conversation <i class="bi bi-arrow-up-right"></i>
          </button>
        </div>

        <div class="corp-visual">
          <img
            :src="corporateImage"
            alt="Handmade pieces in a creative studio"
            decoding="async"
            loading="lazy"
          />

          <div class="badge-circle">Made by real people</div>
        </div>
      </div>
    </section>

    <section class="clients-section" id="clients">
      <div class="clients-head">
        <div class="clients-eyebrow">
          <span class="dot"></span>
          <span>Success stories</span>
        </div>
        <h2>Our Renowned Clients</h2>
      </div>

      <div v-if="partnersLoading" class="clients-empty" role="status">
        Loading partnerships...
      </div>

      <div v-else-if="partnersError" class="clients-empty" role="alert">
        {{ partnersError }}
      </div>

      <div
        v-else-if="!partnerSlides.length"
        class="clients-empty"
        role="status"
      >
        No partnerships recorded yet.
      </div>

      <div
        v-else
        class="partner-ticker"
        :class="{ 'details-open': openPartner !== '' }"
        aria-label="Our partners"
      >
        <div class="partner-ticker-track">
          <div
            v-for="p in partnerSlides"
            :key="p.slideKey"
            class="partner-item"
            :class="{ 'is-open': openPartner === p.slideKey }"
          >
            <component
              :is="p.href ? 'a' : 'span'"
              class="partner-logo"
              :href="p.href || undefined"
              :target="p.href ? '_blank' : undefined"
              :rel="p.href ? 'noopener noreferrer' : undefined"
              :aria-label="p.href ? `Visit ${p.name}` : undefined"
              @click="closePartner"
            >
              <img
                :src="p.image"
                :alt="p.name"
                decoding="async"
                draggable="false"
              />
            </component>

            <button
              class="partner-details-toggle"
              type="button"
              :aria-label="
                openPartner === p.slideKey
                  ? `Hide details for ${p.name}`
                  : `Show details for ${p.name}`
              "
              :aria-expanded="openPartner === p.slideKey"
              :aria-controls="`partner-info-${p.slideKey}`"
              @click="togglePartner(p.slideKey)"
            >
              <i
                :class="
                  openPartner === p.slideKey ? 'bi bi-x-lg' : 'bi bi-info-lg'
                "
                aria-hidden="true"
              ></i>
            </button>

            <div :id="`partner-info-${p.slideKey}`" class="partner-info">
              <div class="partner-info-heading">
                <span class="partner-info-dot"></span>
                Partner details
              </div>

              <div class="partner-info-row">
                <div class="partner-info-text">
                  <span class="partner-info-label">Name</span>
                  <strong>{{ p.name }}</strong>
                </div>

                <button
                  class="partner-copy-btn"
                  type="button"
                  :aria-label="`Copy name: ${p.name}`"
                  @click="copyPartnerText(p.name, `${p.slideKey}-name`)"
                >
                  <i
                    :class="
                      copiedPartnerField === `${p.slideKey}-name`
                        ? 'bi bi-check2'
                        : 'bi bi-copy'
                    "
                    aria-hidden="true"
                  ></i>
                </button>
              </div>

              <div class="partner-info-row">
                <div class="partner-info-text">
                  <span class="partner-info-label"> Link / Email </span>
                  <span class="partner-info-url">
                    {{ p.url || "No link provided" }}
                  </span>
                </div>

                <button
                  v-if="p.url"
                  class="partner-copy-btn"
                  type="button"
                  :aria-label="`Copy link: ${p.url}`"
                  @click="copyPartnerText(p.url, `${p.slideKey}-url`)"
                >
                  <i
                    :class="
                      copiedPartnerField === `${p.slideKey}-url`
                        ? 'bi bi-check2'
                        : 'bi bi-copy'
                    "
                    aria-hidden="true"
                  ></i>
                </button>
              </div>

              <p class="partner-copy-status" role="status">
                {{
                  partnerCopyError ||
                  (copiedPartnerField === `${p.slideKey}-name` ||
                  copiedPartnerField === `${p.slideKey}-url`
                    ? "Copied!"
                    : "")
                }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.products-empty {
  text-align: center;
  padding: 56px 20px;
  color: var(--gray-warm);
  border: 1px dashed var(--border-3, #d9c9bd);
  border-radius: 24px;
}

.products-empty i {
  display: block;
  font-size: 40px;
  color: var(--terracotta-2, #bd6c59);
  margin-bottom: 18px;
}

.products-empty p {
  font-size: 20px;
  margin: 0;
}

.story-media {
  position: relative;
}

.story-media .round-img {
  position: absolute;
  bottom: -20px;
  right: -20px;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid #fff;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 2;
}

.story-media .round-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-section {
  background: #fbf8f5 !important;
}

.hero-section .hero-bg {
  background: #fbf8f5 !important;
  opacity: 1;
}

.hero-bg > img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  opacity: 1;
  filter: none;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(251, 248, 245, 0.96) 0%,
    rgba(251, 248, 245, 0.88) 38%,
    rgba(251, 248, 245, 0.22) 72%,
    rgba(251, 248, 245, 0.08) 100%
  );
}

.hero-content {
  width: min(1180px, 100%);
  text-align: left;
}

.hero-content h1,
.hero-content p.lead {
  max-width: 620px;
  margin-left: 0;
  margin-right: 0;
}

.hero-content h1 .accent {
  display: inline;
}

.hero-cta {
  justify-content: flex-start;
}

.story-text > p:not(.eyebrow) {
  margin-top: 18px;
}

@media (max-width: 700px) {
  .hero-overlay {
    background: rgba(251, 248, 245, 0.78);
  }

  .hero-content {
    text-align: center;
  }

  .hero-content h1,
  .hero-content p.lead {
    margin-left: auto;
    margin-right: auto;
  }

  .hero-cta {
    justify-content: center;
  }
}

.clients-section {
  padding-top: 64px;
  padding-bottom: 64px;
}

.clients-section .clients-head {
  margin-bottom: 30px;
}

.clients-section .clients-head h2 {
  font-size: clamp(30px, 3vw, 44px);
  line-height: 1.2;
}

.partner-ticker {
  width: 100%;
  overflow: hidden;
  padding: 16px 0 24px;
  container-type: inline-size;
  direction: ltr;
}

.partner-ticker-track {
  display: flex;
  align-items: center;
  gap: 24px;
  width: max-content;
  min-width: 100%;
  animation: partnerTicker 32s linear infinite alternate;
  will-change: transform;
}

/* أربعة كروت على الكمبيوتر */
.partner-item {
  position: relative;
  flex: 0 0 calc((100cqw - 72px) / 4);
  width: calc((100cqw - 72px) / 4);
  aspect-ratio: 4 / 3;
  min-width: 0;
}

.partner-logo {
  box-sizing: border-box;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 1px solid #e7d8cc;
  border-radius: 22px;
  background: #fffdfb;
  box-shadow: 0 6px 16px rgba(78, 48, 31, 0.08);
  text-decoration: none;
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease;
}

a.partner-logo {
  cursor: pointer;
}

.partner-logo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 0.35s ease;
}

.partner-logo:focus-visible,
.partner-details-toggle:focus-visible,
.partner-copy-btn:focus-visible {
  outline: 3px solid #bd6c59;
  outline-offset: 3px;
}

/* زر إظهار المعلومات دون التأثير على رابط الصورة */
.partner-details-toggle {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid #ead8cb;
  border-radius: 50%;
  background: rgba(255, 253, 251, 0.96);
  color: #a76551;
  box-shadow: 0 3px 10px rgba(44, 28, 20, 0.12);
  cursor: pointer;
}

.partner-info {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 2;
  box-sizing: border-box;
  max-height: calc(100% - 60px);
  overflow-y: auto;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 16px;
  background: rgba(255, 253, 251, 0.96);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(44, 28, 20, 0.18);
  color: #332d29;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(8px);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    visibility 0.2s ease;
}

/* إظهار البوكس عند فتحه صراحة أو التنقل بلوحة المفاتيح */
.partner-item.is-open .partner-info,
.partner-item:has(:focus-visible) .partner-info {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0);
}

/* التركيز الناتج عن النقر العادي لا يوقف الشريط */
.partner-ticker.details-open .partner-ticker-track,
.partner-ticker:has(:focus-visible) .partner-ticker-track {
  animation-play-state: paused;
}

/* تفعيل تأثير الماوس فقط للأجهزة التي تدعم تمرير المؤشر */
@media (hover: hover) and (pointer: fine) {
  .partner-item:hover .partner-info {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateY(0);
  }

  .partner-ticker:hover .partner-ticker-track {
    animation-play-state: paused;
  }

  .partner-item:hover .partner-logo {
    border-color: #bd6c59;
    box-shadow: 0 10px 22px rgba(78, 48, 31, 0.14);
  }

  .partner-item:hover .partner-logo img {
    transform: scale(1.04);
  }

  .partner-copy-btn:hover,
  .partner-details-toggle:hover {
    background: #bd6c59;
    color: #fff;
  }
}

.partner-info-heading {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 10px;
  color: #a76551;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.partner-info-dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #bd6c59;
}

.partner-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.partner-info-row + .partner-info-row {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #eadfd6;
}

.partner-info-text {
  flex: 1;
  min-width: 0;
}

.partner-info-label {
  display: block;
  margin-bottom: 3px;
  color: #937d70;
  font-size: 10px;
}

.partner-info-text strong {
  display: block;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.partner-info-url {
  display: block;
  color: #706158;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.partner-copy-btn {
  display: grid;
  place-items: center;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid #ead8cb;
  border-radius: 10px;
  background: #f7eee7;
  color: #a76551;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.partner-copy-status {
  min-height: 14px;
  margin: 8px 0 0;
  color: #53794d;
  font-size: 10px;
}

@keyframes partnerTicker {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(min(0px, calc(100cqw - 100%)));
  }
}

/* صورتان على الشاشات المتوسطة */
@media (max-width: 900px) {
  .partner-item {
    flex-basis: calc((100cqw - 24px) / 2);
    width: calc((100cqw - 24px) / 2);
  }
}

/* زيادة ارتفاع الصورة لاستيعاب التفاصيل على الهاتف */
@media (max-width: 600px) {
  .clients-section {
    padding-top: 40px;
    padding-bottom: 40px;
  }

  .partner-ticker-track {
    gap: 14px;
  }

  .partner-item {
    flex-basis: calc((100cqw - 14px) / 2);
    width: calc((100cqw - 14px) / 2);
    aspect-ratio: 3 / 4;
  }

  .partner-logo {
    border-radius: 16px;
  }

  .partner-details-toggle {
    top: 8px;
    right: 8px;
    width: 32px;
    height: 32px;
  }

  .partner-info {
    left: 6px;
    right: 6px;
    bottom: 6px;
    max-height: calc(100% - 48px);
    padding: 10px;
    border-radius: 12px;
  }
}

/* احترام إعداد تقليل الحركة */
@media (prefers-reduced-motion: reduce) {
  .partner-ticker {
    overflow-x: auto;
  }

  .partner-ticker-track {
    animation: none;
    transform: none;
  }

  .partner-logo,
  .partner-logo img,
  .partner-info,
  .partner-copy-btn {
    transition: none;
  }

  .partner-item:hover .partner-logo img {
    transform: none;
  }
}
</style>
