<script setup>
import { useNavigation } from "../composables/navigation.js";

const { navigate } = useNavigation();
</script>

<template>
  <main class="catalog-main story-page">
    <div class="catalog-top">
      <button
        class="btn-back"
        type="button"
        @click="navigate('index.html')"
      >
        <i class="bi bi-arrow-left" aria-hidden="true"></i>
        Back to Home
      </button>

      <span class="catalog-tag">Our Story</span>
    </div>

    <section
      class="story-content-section"
      aria-label="Our story"
    >
      <!-- الصورة الأولى في أعلى الصفحة -->
      <div class="story-full-img-container">
        <img
          src="../assets/images/image.png"
          alt="Heart Made creators"
          class="story-full-img"
          decoding="async"
          loading="eager"
          fetchpriority="high"
        />
      </div>

      <h3>Why Heart Made Exists</h3>

      <p>
        We believe adulthood should open the door to new opportunities, not
        fewer ones.
      </p>

      <h3>Our Beginning</h3>

      <p>
        Heart Made began with a question we asked ourselves as parents:
      </p>

      <p>
        <strong>
          What comes next for our children after graduating from specialized
          centers?
        </strong>
      </p>

      <p>
        Our children are young adults with developmental disabilities. For
        years, we watched them learn, develop new skills, become more
        independent, and discover what they enjoy and what they can do.
      </p>

      <p>
        But as they reached adulthood and graduation, we faced a reality shared
        by many families: meaningful opportunities to work, contribute, and
        continue growing became much harder to find, especially opportunities
        tailored to their individual needs, abilities, and strengths.
      </p>

      <p>
        We didn't want our children's journey to stop there!
      </p>

      <p>
        So, as parents, we created Heart Made Zone for our children — and for
        other young adults like them.
      </p>

      <p>
        We wanted to create a place where their abilities are recognized and
        continue to grow. A place where creativity can become meaningful work.
        A place where they can contribute, earn, build confidence, connect with
        others, and feel that they belong.
      </p>

      <p>
        That idea became Heart Made Zone.
      </p>

      <!-- الصورة الثانية في منتصف الصفحة -->
      <div class="story-full-img-container">
        <img
          src="../assets/images/team.png"
          alt="Handmade items in studio"
          class="story-full-img"
          decoding="async"
          loading="lazy"
        />
      </div>

      <h3>What We Believe</h3>

      <h4>Opportunity, Not Charity</h4>

      <p>
        Heart Made is built around what our children can do.
      </p>

      <p>
        Our young adults are not simply beneficiaries of a project. They are
        makers, team members, and entrepreneurs who actively contribute to
        creating Heart Made products, bringing more joy to the world.
      </p>

      <p>
        Each person participates according to their abilities, interests, and
        strengths through drawing, creating, assembling, preparing, packaging,
        or adding the finishing touches to a product.
      </p>

      <p>
        Every contribution matters. Together, these contributions create
        products with value, purpose, and a story behind them.
      </p>

      <p>
        Heart Made Zone is a place designed around abilities and possibilities,
        where our children can continue learning, working, and building a
        meaningful adult life.
      </p>

      <h3>Our Vision</h3>

      <p>
        To build a sustainable social enterprise where young adults with
        developmental disabilities have meaningful opportunities to work, earn,
        contribute, belong, and continue growing throughout adulthood.
      </p>

      <p>
        <strong>
          Because becoming an adult should not mean having fewer opportunities.
          It should mean discovering new ones.
        </strong>
      </p>
    </section>
  </main>
</template>

<style scoped>
.story-page,
.story-page * {
  box-sizing: border-box;
}

.story-page {
  width: 100%;
  min-width: 0;
  padding: 112px clamp(16px, 4vw, 64px) 64px;
}

.story-page .catalog-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  max-width: 800px;
  margin: 0 auto 24px;
  padding-bottom: 20px;
}

.story-page .btn-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  max-width: 100%;
  padding: 10px 16px;
  font-size: 14px;
  line-height: 1.4;
  white-space: normal;
  text-align: center;
}

.story-page .btn-back i {
  flex-shrink: 0;
}

.story-page .btn-back:focus-visible {
  outline: 2px solid var(--terracotta-2, #bd6c59);
  outline-offset: 4px;
}

.story-page .catalog-tag {
  flex-shrink: 0;
  font-size: 12px;
  line-height: 1.5;
}

.story-content-section {
  width: 100%;
  max-width: 800px;
  min-width: 0;
  margin: 0 auto;
  padding: 0;
  color: var(--gray-dark, #333);
  line-height: 1.8;
  overflow-wrap: anywhere;
}

.story-content-section h3 {
  margin: clamp(28px, 5vw, 40px) 0 14px;
  font-family: var(--font-serif, Georgia, serif);
  font-size: clamp(23px, 4vw, 28px);
  line-height: 1.3;
  color: #1a1a1a;
}

.story-content-section h4 {
  margin: 24px 0 12px;
  font-size: clamp(18px, 3vw, 20px);
  font-weight: 600;
  line-height: 1.4;
}

.story-content-section p {
  margin: 0 0 20px;
  font-size: clamp(16px, 2vw, 17px);
  line-height: 1.85;
  text-align: start;
}

.story-content-section > :last-child {
  margin-bottom: 0;
}

.story-full-img-container {
  width: 100%;
  min-width: 0;
  margin: clamp(24px, 4vw, 35px) 0;
}

.story-full-img-container:first-child {
  margin-top: 0;
}

/* عرض الصور بنسبها الأصلية دون قصها أو تمديدها على الجوال. */
.story-full-img {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  border-radius: clamp(10px, 2vw, 16px);
  box-shadow: 0 10px 25px rgb(0 0 0 / 8%);
}

@media (max-width: 575.98px) {
  .story-page {
    padding-bottom: 40px;
  }

  .story-page .catalog-top {
    margin-bottom: 20px;
    padding-bottom: 16px;
  }

  .story-page .catalog-tag {
    font-size: 11px;
    letter-spacing: 0.1em;
  }

  .story-content-section p {
    margin-bottom: 16px;
  }
}

@media (max-width: 359.98px) {
  .story-page .catalog-top {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>