<script setup lang="ts">
import { applyPureReactInVue } from 'veaury'

import { ReactHostShell } from '@/react_app/shell/ReactHostShell'
import { activeTab } from '@/stores/tabs'

const ReactHost = applyPureReactInVue(ReactHostShell)
const showSmoke = import.meta.env.DEV
</script>

<template>
  <ReactHost :editor="activeTab?.store" :show-smoke="showSmoke" />
</template>
