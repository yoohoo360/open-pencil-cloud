<script setup lang="ts">
import { applyPureReactInVue } from 'veaury'

import { Toolbar as ToolbarReact } from '@/react_app/toolbar/Toolbar'
import { activeTab } from '@/stores/tabs'

const Toolbar = applyPureReactInVue(ToolbarReact)
</script>

<template>
  <Toolbar v-if="activeTab" :key="activeTab.id" :editor="activeTab.store" />
</template>
