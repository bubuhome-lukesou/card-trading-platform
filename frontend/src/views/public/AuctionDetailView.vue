<script setup lang="ts">
import { ref } from 'vue'

const product = ref({
  id: '',
  titleEn: 'Loading...',
  titleZh: '加载中...'
})
</script>

<template>
  <div class="auction-detail">
    <div class="container">
      <h1>{{ product.titleEn }} - Auction</h1>
    </div>
  </div>
</template>
