<script setup>
import { useNavigation } from "../composables/navigation.js";
const { navigate } = useNavigation();
import { useRoute } from "vue-router";
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
      <div class="brand-mini" @click="navigate('index.html')">
        <span class="heart-badge"
          ><i class="bi bi-heart-fill" style="font-size: 15px"></i
        ></span>
        <span class="brand-text">Heart<br /><em>Made</em></span>
      </div>
    </div>
  </header>
</template>
