<script setup lang="ts">
import { useI18n, useSelectionState } from '@open-pencil/vue'
import TextField from '@/components/inputs/TextField.vue'
import PanelFieldGroup from '../ui/panel/PanelFieldGroup.vue'
import PanelContent from '../ui/panel/PanelContent.vue'
import IconButton from '@/components/ui/IconButton.vue'
import { computed } from 'vue'
import { useEditorStore } from '@/app/editor/active-store'

const { selectedNode: node } = useSelectionState()
const { panels } = useI18n()
const editor = useEditorStore()

const bound = computed(() => {
  if (node?.value?.componentPropertyReferences?.length) {
    const data = node?.value?.componentPropertyReferences?.find((item) => item.field === 'TEXT')
    if (data?.defId) {
      return true
    }
  }

  return false
})

const disable = computed(() => {
  return !!node?.value?.componentPropertyReferences?.some((it) => it.field === 'TEXT')
})
const onChange = (e: string) => {
  editor.graph.updateNode(node.value?.id, {
    text: e
  })
}
</script>

<template>
  <PanelContent>
    <PanelFieldGroup :label="panels.content" v-if="!!node?.id">
      <PanelItemRow>
        <TextField :value="node?.text" @change="onChange" :disabled="disable" />
        <template #rail>
          <IconButton v-if="bound">
            <icon-lucide-diamond-plus class="size-3" />
          </IconButton>
          <IconButton v-else>
            <icon-lucide-diamond class="size-3" />
          </IconButton>
        </template>
      </PanelItemRow>
    </PanelFieldGroup>
  </PanelContent>
</template>
