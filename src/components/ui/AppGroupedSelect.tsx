<script setup lang="ts" generic="T extends string | number">
import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemText,
  SelectLabel,
  SelectPortal,
  SelectRoot,
  SelectSeparator,
  SelectTrigger,
  SelectViewport
} from 'reka-ui'
import { computed } from 'vue'

import { selectContent, selectItem, selectTrigger } from '@/components/ui/select'
import { useComponentUI } from '@/components/ui/use-component-ui'

interface SelectOption<TValue extends string | number> {
  value: TValue
  label: string
}

interface SelectGroupDef<TValue extends string | number> {
  label?: string
  items: SelectOption<TValue>[]
}

interface GroupedSelectUi {
  trigger?: string
  content?: string
  item?: string
  label?: string
  separator?: string
}

const { groups, displayValue, ui, testId } = defineProps<{
  groups: SelectGroupDef<T>[]
  displayValue: string
  ui?: GroupedSelectUi
  testId?: string
}>()

const modelValue = defineModel<T>({ required: true })

const uiProp = useComponentUI(ui, {
  trigger:
    'w-full justify-between rounded border border-border bg-input px-2 py-1 text-[11px] text-surface',
  content: 'isolate z-[52]',
  item: 'rounded px-2 py-1 text-[11px]',
  label: 'px-2 py-1 text-[10px] text-muted',
  separator: 'mx-1 my-1 h-px bg-border'
})

const cls = computed(() => ({
  trigger: selectTrigger({ class: uiProp.value.trigger }),
  content: selectContent({ radius: 'lg', padding: 'md', class: uiProp.value.content }),
  item: selectItem({ class: uiProp.value.item }),
  label: uiProp.value.label,
  separator: uiProp.value.separator
}))
</script>

<template>
  <SelectRoot v-model="modelValue">
    <SelectTrigger :data-test-id="testId" :class="cls.trigger">
      <slot name="value">{{ displayValue }}</slot>
      <icon-lucide-chevron-down class="size-2.5 shrink-0 text-muted" />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent position="popper" :side-offset="4" :class="cls.content">
        <SelectViewport>
          <template v-for="(group, index) in groups" :key="index">
            <SelectGroup>
              <SelectLabel v-if="group.label" :class="cls.label">
                {{ group.label }}
              </SelectLabel>
              <SelectItem
                v-for="item in group.items"
                :key="String(item.value)"
                :value="item.value"
                :class="cls.item"
              >
                <SelectItemText>{{ item.label }}</SelectItemText>
              </SelectItem>
            </SelectGroup>
            <SelectSeparator v-if="index < groups.length - 1" :class="cls.separator" />
          </template>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
