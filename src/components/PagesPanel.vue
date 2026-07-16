<script setup lang="ts">
import { applyPureReactInVue } from 'veaury'

import { PagesPanel as PagesPanelReact } from '@/react_app/pages/PagesPanel'
import { activeTab } from '@/stores/tabs'

const PagesPanel = applyPureReactInVue(PagesPanelReact)
</script>

<template>
  <PagesPanel v-if="activeTab" :key="activeTab.id" :editor="activeTab.store" />
</template>
