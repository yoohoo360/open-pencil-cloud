<script setup lang="ts">
import { applyPureReactInVue } from 'veaury'

import { MobileHud as MobileHudReact } from '@/react_app/mobile/MobileHud'
import { useCollabInjected } from '@/composables/use-collab'
import { activeTab } from '@/stores/tabs'

const MobileHud = applyPureReactInVue(MobileHudReact)
const collab = useCollabInjected()
</script>

<template>
  <MobileHud
    v-if="activeTab"
    :key="'mobile-hud-' + activeTab.id"
    :editor="activeTab.store"
    :collab="collab"
  />
</template>
