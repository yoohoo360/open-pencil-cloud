<script setup lang="ts">
import { applyPureReactInVue } from 'veaury'

import { TabBar as TabBarReact } from '@/react_app/shell/TabBar'

const TabBar = applyPureReactInVue(TabBarReact)
</script>

<template>
  <TabBar />
</template>
