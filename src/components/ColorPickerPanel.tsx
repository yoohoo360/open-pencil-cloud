<script setup lang="ts">
import { computed } from 'vue'
import { ColorAreaRoot, ColorAreaArea, ColorAreaThumb } from 'reka-ui'

import type { Color } from '@open-pencil/core'
import { colorToCSS } from '@open-pencil/core'
import type { OkHCLControls } from '@open-pencil/vue/ColorPicker/types'
import {
  createColorPickerModel,
  createOkHCLSliderGradientModel,
  createOkHCLSliderPreviewModel,
  createSliderGradientModel,
  createSliderPreviewModel,
  fromPercent,
  rekaToAppColor,
  toPercent,
  updateAlpha,
  updateHSBChannel,
  updateHSLChannel,
  updateHue,
  updateRGBChannel,
  useI18n
} from '@open-pencil/vue'
import PickerSlider from './PickerSlider.vue'
import AppSelect from './ui/AppSelect.vue'

const { color, okhcl = null } = defineProps<{
  color: Color
  okhcl?: OkHCLControls | null
}>()

const emit = defineEmits<{
  update: [color: Color]
}>()

const { panels } = useI18n()

const pickerModel = computed(() => createColorPickerModel(color))
const rekaColor = computed(() => pickerModel.value.rekaColor)
const hslColor = computed(() => pickerModel.value.hsl)
const hsbColor = computed(() => pickerModel.value.hsb)
const rgbColor = computed(() => pickerModel.value.rgb)
const sliderPreview = computed(() => createSliderPreviewModel(pickerModel.value))
const sliderGradient = computed(() => createSliderGradientModel(pickerModel.value))
const okhclSliderPreview = computed(() =>
  okhcl?.okhcl ? createOkHCLSliderPreviewModel(okhcl.okhcl) : null
)
const okhclSliderGradient = computed(() =>
  okhcl?.okhcl ? createOkHCLSliderGradientModel(okhcl.okhcl) : null
)
const fieldOptions = computed(() =>
  okhcl?.fieldOptions ?? [
    { value: 'rgb', label: panels.value.colorFormatRgb },
    { value: 'hsl', label: panels.value.colorFormatHsl },
    { value: 'hsb', label: panels.value.colorFormatHsb }
  ]
)
const fieldFormat = computed(() => okhcl?.fieldFormat ?? 'rgb')
const isOkHCLFormat = computed(() => fieldFormat.value === 'okhcl' && okhcl)

function onRekaColorUpdate(colorValue: ReturnType<typeof createColorPickerModel>['rekaColor']) {
  emit('update', rekaToAppColor(colorValue))
}

function setFieldFormat(value: string) {
  okhcl?.setFieldFormat(value as NonNullable<OkHCLControls>['fieldFormat'])
}

function updateRGBAHue(value: number) {
  emit('update', updateHue(pickerModel.value, value))
}

function updateRGBAAlpha(value: number) {
  emit('update', updateAlpha(color, value))
}

function updateRGBChannelValue(channel: 'r' | 'g' | 'b', value: number) {
  emit('update', updateRGBChannel(color, channel, value))
}

function updateHSLChannelValue(channel: 'h' | 's' | 'l', value: number) {
  emit('update', updateHSLChannel(pickerModel.value, channel, value))
}

function updateHSBChannelValue(channel: 'h' | 's' | 'b', value: number) {
  emit('update', updateHSBChannel(pickerModel.value, channel, value))
}

function updateOkHCLChannel(channel: 'h' | 'c' | 'l' | 'a', value: number) {
  okhcl?.updateOkHCL({ [channel]: value })
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <ColorAreaRoot
      v-slot="{ style }"
      :model-value="rekaColor"
      color-space="hsb"
      x-channel="saturation"
      y-channel="brightness"
      @update:color="onRekaColorUpdate"
    >
      <ColorAreaArea
        class="relative h-[140px] w-full cursor-crosshair overflow-hidden rounded"
        :style="style"
      >
        <ColorAreaThumb
          class="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
        />
      </ColorAreaArea>
    </ColorAreaRoot>

    <template v-if="fieldFormat !== 'okhcl'">
      <PickerSlider
        label="H"
        :model-value="hslColor.h ?? 0"
        :min="0"
        :max="360"
        :step="1"
        gradient-style="background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);"
        :thumb-fill="colorToCSS(sliderPreview.hue)"
        :ui="{ root: 'gap-0', label: 'hidden', input: 'hidden' }"
        test-id="color-slider-hue"
        @update:model-value="updateRGBAHue"
      />

      <PickerSlider
        label="A"
        :model-value="color.a"
        :min="0"
        :max="1"
        :step="0.001"
        checkerboard
        :gradient-style="`background: linear-gradient(to right, transparent, ${colorToCSS({ ...color, a: 1 })})`"
        :thumb-fill="colorToCSS(color)"
        :ui="{ root: 'gap-0', label: 'hidden', input: 'hidden' }"
        test-id="color-slider-alpha"
        @update:model-value="updateRGBAAlpha"
      />
    </template>

    <div class="flex flex-col gap-2">
      <AppSelect
        class="w-[120px]"
        test-id="color-format-select"
        :model-value="fieldFormat"
        :options="fieldOptions"
        @update:model-value="setFieldFormat"
      />

      <div class="min-w-0 flex flex-col gap-2">
        <div v-if="fieldFormat === 'rgb'" class="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded border border-border bg-border">
          <input type="number" class="bg-input px-2 py-1 text-xs text-surface outline-none" :value="Math.round(rgbColor.r)" min="0" max="255" @change="updateRGBChannelValue('r', +($event.target as HTMLInputElement).value)" />
          <input type="number" class="bg-input px-2 py-1 text-xs text-surface outline-none" :value="Math.round(rgbColor.g)" min="0" max="255" @change="updateRGBChannelValue('g', +($event.target as HTMLInputElement).value)" />
          <input type="number" class="bg-input px-2 py-1 text-xs text-surface outline-none" :value="Math.round(rgbColor.b)" min="0" max="255" @change="updateRGBChannelValue('b', +($event.target as HTMLInputElement).value)" />
        </div>

        <template v-else-if="fieldFormat === 'hsl'">
          <div class="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded border border-border bg-border">
            <input type="number" class="bg-input px-2 py-1 text-xs text-surface outline-none" :value="Math.round(hslColor.h ?? 0)" min="0" max="360" @change="updateHSLChannelValue('h', +($event.target as HTMLInputElement).value)" />
            <input type="number" class="bg-input px-2 py-1 text-xs text-surface outline-none" :value="Math.round(hslColor.s ?? 0)" min="0" max="100" @change="updateHSLChannelValue('s', +($event.target as HTMLInputElement).value)" />
            <input type="number" class="bg-input px-2 py-1 text-xs text-surface outline-none" :value="Math.round(hslColor.l ?? 0)" min="0" max="100" @change="updateHSLChannelValue('l', +($event.target as HTMLInputElement).value)" />
          </div>

          <PickerSlider
            label="S"
            :model-value="hslColor.s ?? 0"
            :min="0"
            :max="100"
            :step="0.1"
            :display-value="Math.round(hslColor.s ?? 0)"
            :display-min="0"
            :display-max="100"
            :display-step="1"
            :gradient-style="sliderGradient.hslSaturation"
            :thumb-fill="colorToCSS(sliderPreview.hslSaturation)"
            test-id="color-slider-hsl-s"
            @update:model-value="updateHSLChannelValue('s', $event)"
          />

          <PickerSlider
            label="L"
            :model-value="hslColor.l ?? 0"
            :min="0"
            :max="100"
            :step="0.1"
            :display-value="Math.round(hslColor.l ?? 0)"
            :display-min="0"
            :display-max="100"
            :display-step="1"
            :gradient-style="sliderGradient.hslLightness"
            :thumb-fill="colorToCSS(sliderPreview.hslLightness)"
            test-id="color-slider-hsl-l"
            @update:model-value="updateHSLChannelValue('l', $event)"
          />

          <p class="text-[10px] leading-4 text-muted">{{ panels.colorHintHsl }}</p>
        </template>

        <template v-else-if="fieldFormat === 'hsb'">
          <div class="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded border border-border bg-border">
            <input type="number" class="bg-input px-2 py-1 text-xs text-surface outline-none" :value="Math.round(hsbColor.h)" min="0" max="360" @change="updateHSBChannelValue('h', +($event.target as HTMLInputElement).value)" />
            <input type="number" class="bg-input px-2 py-1 text-xs text-surface outline-none" :value="Math.round(hsbColor.s)" min="0" max="100" @change="updateHSBChannelValue('s', +($event.target as HTMLInputElement).value)" />
            <input type="number" class="bg-input px-2 py-1 text-xs text-surface outline-none" :value="Math.round(hsbColor.b)" min="0" max="100" @change="updateHSBChannelValue('b', +($event.target as HTMLInputElement).value)" />
          </div>

          <PickerSlider
            label="S"
            :model-value="hsbColor.s"
            :min="0"
            :max="100"
            :step="0.1"
            :display-value="Math.round(hsbColor.s)"
            :display-min="0"
            :display-max="100"
            :display-step="1"
            :gradient-style="sliderGradient.hsbSaturation"
            :thumb-fill="colorToCSS(sliderPreview.hsbSaturation)"
            test-id="color-slider-hsb-s"
            @update:model-value="updateHSBChannelValue('s', $event)"
          />

          <PickerSlider
            label="B"
            :model-value="hsbColor.b"
            :min="0"
            :max="100"
            :step="0.1"
            :display-value="Math.round(hsbColor.b)"
            :display-min="0"
            :display-max="100"
            :display-step="1"
            :gradient-style="sliderGradient.hsbBrightness"
            :thumb-fill="colorToCSS(sliderPreview.hsbBrightness)"
            test-id="color-slider-hsb-b"
            @update:model-value="updateHSBChannelValue('b', $event)"
          />

          <p class="text-[10px] leading-4 text-muted">{{ panels.colorHintHsb }}</p>
        </template>

        <div v-else-if="isOkHCLFormat && okhcl?.okhcl" class="flex flex-col gap-2">
          <PickerSlider
            label="H"
            :model-value="okhcl.okhcl.h"
            :min="0"
            :max="360"
            :step="1"
            :display-value="Math.round(okhcl.okhcl.h)"
            :display-min="0"
            :display-max="360"
            :display-step="1"
            gradient-style="background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);"
            :thumb-fill="colorToCSS(okhclSliderPreview?.okhclHue ?? color)"
            test-id="color-slider-okhcl-h"
            @update:model-value="updateOkHCLChannel('h', $event)"
          />

          <PickerSlider
            label="C"
            :model-value="okhcl.okhcl.c"
            :min="0"
            :max="0.4"
            :step="0.001"
            :display-value="toPercent(okhcl.okhcl.c)"
            :display-min="0"
            :display-max="40"
            :display-step="1"
            :parse-display="fromPercent"
            :gradient-style="okhclSliderGradient?.okhclChroma ?? undefined"
            :thumb-fill="colorToCSS(okhclSliderPreview?.okhclChroma ?? color)"
            test-id="color-slider-okhcl-c"
            @update:model-value="updateOkHCLChannel('c', $event)"
          />

          <PickerSlider
            label="L"
            :model-value="okhcl.okhcl.l"
            :min="0"
            :max="1"
            :step="0.001"
            :display-value="toPercent(okhcl.okhcl.l)"
            :display-min="0"
            :display-max="100"
            :display-step="1"
            :parse-display="fromPercent"
            :gradient-style="okhclSliderGradient?.okhclLightness ?? undefined"
            :thumb-fill="colorToCSS(okhclSliderPreview?.okhclLightness ?? color)"
            test-id="color-slider-okhcl-l"
            @update:model-value="updateOkHCLChannel('l', $event)"
          />

          <PickerSlider
            label="A"
            :model-value="okhcl.okhcl.a ?? 1"
            :min="0"
            :max="1"
            :step="0.001"
            :display-value="toPercent(okhcl.okhcl.a ?? 1)"
            :display-min="0"
            :display-max="100"
            :display-step="1"
            :parse-display="fromPercent"
            checkerboard
            :gradient-style="`background: linear-gradient(to right, transparent, ${colorToCSS(color)})`"
            :thumb-fill="colorToCSS(color)"
            test-id="color-slider-okhcl-a"
            @update:model-value="updateOkHCLChannel('a', $event)"
          />

          <div class="flex items-start justify-between gap-2 text-[10px] text-muted">
            <p class="min-w-0 flex-1 leading-4 break-words">{{ panels.colorHintOkhcl }}</p>
            <span
              v-if="okhcl.previewColorSpace"
              class="shrink-0 rounded border border-border px-1 py-0.5 text-[10px] uppercase"
            >
              {{ okhcl.previewColorSpace }}
            </span>
          </div>
          <p v-if="okhcl.clipped" class="text-[10px] leading-4 text-amber-400">
            {{ panels.colorPreviewClipped({ space: okhcl.previewColorSpace ?? 'display-p3' }) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
