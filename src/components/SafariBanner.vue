<script setup lang="ts">
import { applyPureReactInVue } from 'veaury'

import { SafariBanner as SafariBannerReact } from '@/react_app/shell/SafariBanner'

const SafariBanner = applyPureReactInVue(SafariBannerReact)
</script>

<template>
  <SafariBanner />
</template>
