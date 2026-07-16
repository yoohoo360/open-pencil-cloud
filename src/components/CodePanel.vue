<script setup lang="ts">
import { applyPureReactInVue } from 'veaury'

import { CodePanel as CodePanelReact } from '@/react_app/panels/CodePanel'
import { activeTab } from '@/stores/tabs'

const CodePanel = applyPureReactInVue(CodePanelReact)
</script>

<template>
  <CodePanel v-if="activeTab" :key="'code-' + activeTab.id" :editor="activeTab.store" />
</template>
