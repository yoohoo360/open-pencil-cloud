---
title: FillRoot
description: Headless fill category state and conversion actions.
---

<script setup lang="ts">
import ColorFillDemo from '#react/primitives/Fill/demo/ColorFillDemo.vue'
import { data } from './fill-root.data'
</script>

# FillRoot

`FillRoot` owns solid, gradient, and image category state without owning a popover or visual swatch.
Compose it around the picker surface appropriate for your application.

<ColorFillDemo />

Its default slot exposes the current fill, category, transparency, swatch background, and grouped
conversion actions. Category changes emit immutable `Fill` values and are no-ops when the requested
category is already active.

```vue twoslash
<script setup lang="ts">
import { ref } from 'vue'
import type { Fill } from '@open-pencil/scene-graph'
import { FillRoot } from '@open-pencil/react'

const fill = ref<Fill>({
  type: 'SOLID',
  color: { r: 0.2, g: 0.5, b: 0.9, a: 1 },
  opacity: 1,
  visible: true
})
</script>

<template>
  <FillRoot :fill="fill" @update="fill = $event" v-slot="model">
    <button @click="model.actions.toGradient">Gradient</button>
  </FillRoot>
</template>
```

## Generated API reference

<SdkComponentAPI :components="data.components" />

## Related APIs

- [FillSwatch](./fill-swatch)
- [ChannelSlider](./channel-slider)
- [useColorModel](../composables/use-color-model)
