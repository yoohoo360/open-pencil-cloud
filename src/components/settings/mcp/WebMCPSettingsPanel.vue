<script setup lang="ts">
import { computed } from 'vue'

import { useAutomationMessages } from '@open-pencil/vue'

import type { WebMCPMode } from '@/app/automation/webmcp/policy'
import type { WebMCPRuntimeState } from '@/app/automation/webmcp/service'
import SettingsGroup from '@/components/settings/layout/SettingsGroup.vue'
import SettingsLink from '@/components/settings/layout/SettingsLink.vue'
import SettingsRow from '@/components/settings/layout/SettingsRow.vue'
import SettingsSection from '@/components/settings/layout/SettingsSection.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

const mode = defineModel<WebMCPMode>({ required: true })
const { state } = defineProps<{ state: WebMCPRuntimeState }>()
const automation = useAutomationMessages()
const options = computed(() => [
  { value: 'off' as const, label: automation.value.accessOff },
  { value: 'inspect' as const, label: automation.value.accessInspect },
  { value: 'edit' as const, label: automation.value.accessEdit }
])
const descriptions = computed(() => ({
  off: automation.value.accessOffDescription,
  inspect: automation.value.accessInspectDescription,
  edit: automation.value.accessEditDescription
}))
const tone = computed(
  () =>
    (
      ({
        off: 'info',
        starting: 'info',
        ready: 'success',
        unsupported: 'warning',
        error: 'error'
      }) as const
    )[state.status]
)
const detail = computed(() => {
  if (state.error) return state.error
  if (state.status === 'ready') return `${automation.value.tools}: ${state.toolCount}`
  return undefined
})
const status = computed(
  () =>
    ({
      off: automation.value.statusStopped,
      starting: automation.value.statusStarting,
      ready: automation.value.statusRunning,
      unsupported: automation.value.webmcpUnsupported,
      error: automation.value.statusError
    })[state.status]
)
</script>

<template>
  <SettingsSection data-slot="webmcp-settings">
    <template #title>WebMCP</template>
    <template #description>{{ automation.webmcpDescription }}</template>
    <SettingsGroup>
      <SettingsRow :label="automation.browserAccess">
        <AppSelect v-model="mode" :options="options" :label="automation.browserAccess" />
      </SettingsRow>
      <p class="px-3 py-2.5 text-xs leading-relaxed text-muted">{{ descriptions[mode] }}</p>
    </SettingsGroup>
    <AppAlert
      v-if="state.status === 'unsupported' || state.status === 'error'"
      :tone="tone"
      :heading="status"
      :description="detail"
    />
    <div v-else class="text-xs leading-relaxed text-surface" role="status">
      <p>{{ status }}</p>
      <p v-if="detail" class="mt-1 text-muted">{{ detail }}</p>
    </div>
    <SettingsLink href="https://openpencil.dev/programmable/mcp-server#webmcp">
      {{ automation.webmcpSetup }}
    </SettingsLink>
  </SettingsSection>
</template>
