<script setup lang="ts" generic="T extends string | number">
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport
} from 'reka-ui'

import { selectContent, selectItem, selectTrigger } from '@/components/ui/select'
import { useComponentUI } from '@/components/ui/use-component-ui'

interface SelectUi {
  trigger?: string
  content?: string
  viewport?: string
  item?: string
  indicator?: string
}

const {
  options,
  placeholder,
  ui,
  testId = 'app-select-trigger'
} = defineProps<{
  options: { value: T; label: string }[]
  placeholder?: string
  ui?: SelectUi
  testId?: string
}>()

const modelValue = defineModel<T>({ required: true })

const cls = useComponentUI(ui, {
  trigger: 'min-w-0 flex-1 rounded px-1.5 py-1 text-xs',
  content: 'max-h-56',
  viewport: 'p-0.5',
  item: 'rounded py-1.5 pr-2 pl-6 text-xs',
  indicator: 'absolute left-1.5 inline-flex items-center justify-center'
})
</script>

<template>
  <SelectRoot v-model="modelValue">
    <SelectTrigger :data-test-id="testId" :class="selectTrigger({ class: cls.trigger })">
      <SelectValue :placeholder="placeholder" />
      <icon-lucide-chevron-down class="ml-1 size-3 shrink-0 text-muted" />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="2"
        :class="selectContent({ class: cls.content })"
      >
        <SelectViewport :class="cls.viewport">
          <SelectItem
            v-for="opt in options"
            :key="String(opt.value)"
            :value="opt.value"
            :class="selectItem({ class: cls.item })"
          >
            <SelectItemIndicator :class="cls.indicator">
              <icon-lucide-check class="size-3 text-accent" />
            </SelectItemIndicator>
            <SelectItemText>{{ opt.label }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
