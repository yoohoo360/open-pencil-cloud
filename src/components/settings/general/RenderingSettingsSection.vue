<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@open-pencil/vue'

import { appRuntimeConfig } from '@/app/runtime/config'
import { appPreferences, updateCanvasRenderingMode } from '@/app/settings/preferences/store'
import SettingsGroup from '@/components/settings/layout/SettingsGroup.vue'
import SettingsSection from '@/components/settings/layout/SettingsSection.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppBadge from '@/components/ui/feedback/AppBadge.vue'
import AppSwitch from '@/components/ui/toggle/AppSwitch.vue'

const { rendering } = useI18n()
const hasURLOverride = appRuntimeConfig.sceneRendererOverride
const tiledRendering = computed(() => appPreferences.value.rendering.canvasMode === 'tiled')
const changed = computed(
  () => appPreferences.value.rendering.canvasMode !== appRuntimeConfig.sceneRenderer
)

function setTiledRendering(enabled: boolean): void {
  updateCanvasRenderingMode(enabled ? 'tiled' : 'retained')
}
</script>

<template>
  <SettingsSection>
    <template #title>{{ rendering.settingsTitle }}</template>
    <template #description>{{ rendering.settingsDescription }}</template>

    <SettingsGroup>
      <label class="flex items-center justify-between gap-4 px-3 py-2.5">
        <span>
          <span class="flex flex-wrap items-center gap-2 text-xs text-surface">
            {{ rendering.progressiveTiled }}
            <AppBadge :ui="{ base: 'bg-hover text-surface' }">{{
              rendering.experimental
            }}</AppBadge>
          </span>
          <span class="block text-[10px] text-muted">{{
            rendering.progressiveTiledDescription
          }}</span>
        </span>
        <AppSwitch
          :model-value="tiledRendering"
          :label="rendering.progressiveTiled"
          data-test-id="settings-progressive-tiled-rendering"
          @update:model-value="setTiledRendering"
        />
      </label>
    </SettingsGroup>

    <AppAlert v-if="hasURLOverride" :heading="rendering.urlOverride" />
    <AppAlert v-else-if="changed" :heading="rendering.reloadRequired" />
  </SettingsSection>
</template>
