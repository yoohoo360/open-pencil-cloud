<script setup lang="ts">
import { applyPureReactInVue } from 'veaury'

import { ZoomDropdown as ZoomDropdownReact } from '@/react_app/shell/ZoomDropdown'
import { activeTab } from '@/stores/tabs'

const ZoomDropdown = applyPureReactInVue(ZoomDropdownReact)
</script>

<template>
  <ZoomDropdown v-if="activeTab" :key="activeTab.id" :editor="activeTab.store" />
</template>
