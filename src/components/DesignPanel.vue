<script setup lang="ts">
import { applyPureReactInVue } from 'veaury'

import { DesignPanel as DesignPanelReact } from '@/react_app/properties/DesignPanel'
import { activeTab } from '@/stores/tabs'
import { EditorBridge } from '@/react_app/shell/EditorBridge'
import { createElement } from 'react'

const Bridged = (props: { editor: unknown }) =>
  createElement(EditorBridge, { editor: props.editor as never }, createElement(DesignPanelReact))

const DesignPanel = applyPureReactInVue(Bridged)
</script>

<template>
  <DesignPanel v-if="activeTab" :key="'design-' + activeTab.id" :editor="activeTab.store" />
</template>
