<script setup lang="ts">
import { SliderThumb } from 'reka-ui'

import { useChannelSlider } from '#vue/primitives/ChannelSlider/context'
import type {
  ChannelSliderPartProps,
  ChannelSliderThumbSlotProps
} from '#vue/primitives/ChannelSlider/types'

const { as = 'span', asChild = false } = defineProps<ChannelSliderPartProps>()
const context = useChannelSlider()

defineSlots<{
  default?: (props: ChannelSliderThumbSlotProps) => unknown
}>()
</script>

<template>
  <SliderThumb
    :as="as"
    :as-child="asChild"
    :aria-label="context.label.value"
    :aria-valuetext="context.valueText.value"
    data-slot="thumb"
  >
    <slot
      :value="context.value.value"
      :value-text="context.valueText.value"
      :label="context.label.value"
    />
  </SliderThumb>
</template>
