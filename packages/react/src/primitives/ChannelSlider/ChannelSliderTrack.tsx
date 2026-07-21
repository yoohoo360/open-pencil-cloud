<script setup lang="ts">
import { SliderTrack } from 'reka-ui'

import type { ChannelSliderPartProps } from '#vue/primitives/ChannelSlider/types'

const { as = 'span', asChild = false } = defineProps<ChannelSliderPartProps>()
</script>

<template>
  <SliderTrack :as="as" :as-child="asChild" data-slot="track">
    <slot />
  </SliderTrack>
</template>
