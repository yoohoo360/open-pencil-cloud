<script setup lang="ts">
import { applyPureReactInVue } from 'veaury'

import { ReactHostShell } from '@/react_app/shell/ReactHostShell'
import { useEditorStore } from '@/app/editor/active-store'

const store = useEditorStore()
const ReactHost = applyPureReactInVue(ReactHostShell)
const showSmoke = import.meta.env.DEV
</script>

<template>
  <ReactHost :editor="store" :show-smoke="showSmoke" />
</template>
