<script setup lang="ts">
import { applyPureReactInVue } from 'veaury'

import { CollabPanel as CollabPanelReact } from '@/react_app/panels/CollabPanel'
import { useCollabInjected } from '@/composables/use-collab'

const CollabPanel = applyPureReactInVue(CollabPanelReact)
const collab = useCollabInjected()
</script>

<template>
  <CollabPanel :collab="collab" />
</template>
