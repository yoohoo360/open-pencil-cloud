<script setup lang="ts">
import { applyPureReactInVue } from 'veaury'

import { PropertiesPanel as PropertiesPanelReact } from '@/react_app/properties/PropertiesPanel'
import { activeTab } from '@/stores/tabs'

const PropertiesPanel = applyPureReactInVue(PropertiesPanelReact)
</script>

<template>
  <PropertiesPanel v-if="activeTab" :key="activeTab.id" :editor="activeTab.store" />
</template>
