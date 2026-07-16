<script setup lang="ts">
import { applyPureReactInVue } from 'veaury'

import { MobileDrawer as MobileDrawerReact } from '@/react_app/mobile/MobileDrawer'
import { activeTab } from '@/stores/tabs'

const MobileDrawer = applyPureReactInVue(MobileDrawerReact)
</script>

<template>
  <MobileDrawer v-if="activeTab" :key="'mobile-drawer-' + activeTab.id" :editor="activeTab.store" />
</template>
