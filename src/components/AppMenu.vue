<script setup lang="ts">
import { applyPureReactInVue } from 'veaury'

import { AppMenu as AppMenuReact } from '@/react_app/menus/AppMenu'
import { activeTab } from '@/stores/tabs'

const AppMenu = applyPureReactInVue(AppMenuReact)
</script>

<template>
  <AppMenu v-if="activeTab" :key="'app-menu-' + activeTab.id" :editor="activeTab.store" />
</template>
