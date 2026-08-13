<script setup lang="ts">
import { useI18n, useSelectionState } from '@open-pencil/vue'
import { computed } from 'vue'
import { useIconButtonUI } from '@/components/ui/icon-button.ts'
import { useEditorStore } from '@/app/editor/active-store'
import TextField from '@/components/inputs/TextField.vue'
import IconButton from '@/components/ui/IconButton.vue'

const { selectedNode: node } = useSelectionState()
const { panels } = useI18n()
const editor = useEditorStore()

const variantDefs = computed(() => {
  return node.value?.componentPropertyDefinitions ?? []
})

function optionChangeHandle(id: string, newOptions: string[] = []) {
  // editor.updateVariantOptions(node?.value?.id ?? '', id, newOptions)
}

function renameVariant(id: string, newName: string) {
  if (!node?.value?.id || !newName) return
  editor.renamePropertyDefinition(node?.value?.id, id, newName)
}
</script>

<template>
  <PanelFieldGroup :label="panels.componentProperties" v-if="!!node?.id">
    <template #actions>
      <IconButton :label="panels.addComponentProperties">
        <icon-lucide-plus data-test-id="variants-add" class="size-3.5" />
      </IconButton>
    </template>

    <div class="space-y-1">
      <div
        v-for="item in variantDefs"
        :key="item.id"
        class="group rounded flex items-center w-full gap-2"
      >
        <TextField
          :value="item.name"
          @blur="renameVariant(item.id, ($event.target as HTMLInputElement).value)"
          @keydown.enter="renameVariant(item.id, ($event.target as HTMLInputElement).value)"
        >
          <template #icon>
            <icon-lucide-diamond v-if="item?.type === 'VARIANT'" />
            <icon-lucide-square-plus v-if="item?.type === 'SLOT'" />
            <icon-lucide-toggle-left v-if="item?.type === 'BOOLEAN'" />
            <icon-lucide-file-type v-if="item?.type === 'TEXT'" />
            <icon-lucide-square-arrow-right-enter v-if="item?.type === 'INSTANCE_SWAP'" />
          </template>
        </TextField>
        <div class="hidden flex-row items-center gap-1 group-hover:flex group-focus-within:hidden">
          <IconButton
            :label="panels.removeComponentProperties"
            data-test-id="variants-add"
            @click="editor.removePropertyDefinition(node.id, item.id)"
            :class="useIconButtonUI({ size: 'sm' }).base"
          >
            <icon-lucide-sliders-vertical />
          </IconButton>
          <IconButton
            :label="panels.removeComponentProperties"
            data-test-id="variants-add"
            @click="editor.removePropertyDefinition(node.id, item.id)"
            :class="useIconButtonUI({ size: 'sm' }).base"
          >
            <icon-lucide-minus />
          </IconButton>
        </div>
      </div>
    </div>
  </PanelFieldGroup>
</template>
