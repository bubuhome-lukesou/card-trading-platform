<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>
<template>
  <div class="page"><div class="container"><h1>{{ t('admin.dashboard') }}</h1></div></div>
</template>
