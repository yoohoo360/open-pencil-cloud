<script setup lang="ts">
import { useI18n, useSelectionState } from '@open-pencil/vue'

import { computed } from 'vue'
import { useIconButtonUI } from '@/components/ui/icon-button.ts'
import { useSectionUI } from '@/components/ui/section.ts'
import Tip from '@/components/ui/Tip.vue'
import AppTagInput from '@/components/ui/AppTagInput.vue'
import { useEditorStore } from '@/app/editor/active-store'

const { selectedNode: node } = useSelectionState()
const sectionCls = useSectionUI()
const { panels } = useI18n()
const editor = useEditorStore()
const variantDefs = computed<
  {
    id: string
    name: string
    variantOptions?: string[]
  }[]
>(() => {
  return (node.value?.componentPropertyDefinitions ?? []).map((def) => ({
    id: def.id,
    name: def.name,
    variantOptions: def.variantOptions || []
  }))
})
function optionChangeHandle(id: string, newOptions: string[] = []) {
  editor.updateVariantOptions(node?.value?.id ?? '', id, newOptions)
}
function renameVariant(id: string, newName: string) {
  if (!node?.value?.id || !newName) return
  editor.renamePropertyDefinition(node?.value?.id, id, newName)
}
</script>

<template>
  <div
    v-if="node?.type === 'COMPONENT_SET'"
    data-test-id="variant-definition"
    :class="sectionCls.wrapper"
  >
    <div class="flex items-center justify-between">
      <label class="mb-1.5 block text-[11px] font-medium text-muted">
        {{ panels.variants }}
      </label>
      <Tip :label="panels.addVariant">
        <button data-test-id="variants-add" :class="useIconButtonUI().base">+</button>
      </Tip>
    </div>

    <div class="space-y-3">
      <div
        v-for="item in variantDefs"
        :key="item.id"
        class="rounded border border-default p-2 border-border"
      >
        <div class="mb-2 flex items-center gap-2">
          <input
            :value="item.name"
            class="flex-1 rounded px-2 py-1 text-xs text-muted border border-transparent bg-transparent outline-none transition-colors duration-150 focus:border-accent"
            @blur="renameVariant(item.id, ($event.target as HTMLInputElement).value)"
            @keydown.enter="renameVariant(item.id, ($event.target as HTMLInputElement).value)"
          />
          <Tip :label="panels.removeVariant">
            <button
              data-test-id="variants-add"
              @click="editor.removePropertyDefinition(node.id, item.id)"
              :class="useIconButtonUI().base"
            >
              -
            </button>
          </Tip>
        </div>

        <div class="mb-2 flex flex-wrap gap-2">
          <AppTagInput
            :value="item.variantOptions"
            @change="(e) => optionChangeHandle(item.id, e)"
          ></AppTagInput>
        </div>
      </div>
    </div>
  </div>
</template>
