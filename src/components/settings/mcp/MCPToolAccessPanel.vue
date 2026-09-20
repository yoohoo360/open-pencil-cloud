<script setup lang="ts">
import { toRef } from 'vue'

import type { ToolDescriptor } from '@open-pencil/mcp/tools'
import { useAutomationMessages, useCommonMessages } from '@open-pencil/vue'

import { useMCPToolAccess } from '@/app/automation/mcp/settings/tool-access'
import SettingsRow from '@/components/settings/layout/SettingsRow.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import AppSwitch from '@/components/ui/toggle/AppSwitch.vue'

const { tools } = defineProps<{ tools: ToolDescriptor[] }>()
const disabledTools = defineModel<string[]>('disabledTools', { required: true })
const {
  search,
  visibleTools,
  enabledCount,
  inspectionEnabled,
  inspectionState,
  modificationEnabled,
  modificationState,
  isEnabled,
  setToolEnabled
} = useMCPToolAccess(
  toRef(() => tools),
  disabledTools
)
const automation = useAutomationMessages()
const common = useCommonMessages()
</script>

<template>
  <div class="flex flex-col" data-slot="mcp-tool-access">
    <div class="flex shrink-0 items-center justify-between gap-3 border-b border-border p-3">
      <div class="min-w-0 flex-1">
        <h3 class="text-xs font-semibold text-surface">{{ automation.tools }}</h3>
        <p class="mt-1 text-xs text-muted">
          {{ automation.toolsEnabled({ enabled: enabledCount, total: tools.length }) }}
        </p>
      </div>
      <AppButton v-if="disabledTools.length" size="xs" variant="link" @click="disabledTools = []">{{
        automation.enableAllTools
      }}</AppButton>
    </div>
    <div class="sticky top-0 z-10 border-b border-border bg-panel p-3">
      <AppInput
        v-model="search"
        type="search"
        :placeholder="common.search"
        :aria-label="automation.searchTools"
        data-test-id="settings-mcp-tool-search"
      />
    </div>
    <div class="divide-y divide-border border-b border-border">
      <SettingsRow :label="automation.readOnlyTools">
        <AppSwitch
          v-model="inspectionEnabled"
          :state="inspectionState"
          :label="automation.readOnlyTools"
          data-test-id="settings-mcp-inspection-tools"
        />
      </SettingsRow>
      <SettingsRow :label="automation.sideEffectTools">
        <AppSwitch
          v-model="modificationEnabled"
          :state="modificationState"
          :label="automation.sideEffectTools"
          data-test-id="settings-mcp-modification-tools"
        />
      </SettingsRow>
    </div>
    <AppPlaceholder v-if="!visibleTools.length" :label="automation.noMatchingTools" fill />
    <ul v-else class="divide-y divide-border">
      <li v-for="tool in visibleTools" :key="tool.name" class="flex items-start gap-3 p-3">
        <div class="min-w-0 flex-1">
          <code class="break-all text-xs font-medium text-surface">{{ tool.name }}</code>
          <p class="mt-1 text-xs leading-relaxed text-muted">{{ tool.description }}</p>
        </div>
        <AppSwitch
          :model-value="isEnabled(tool)"
          :label="tool.name"
          :data-test-id="`settings-mcp-tool-${tool.name}`"
          @update:model-value="setToolEnabled(tool.name, $event)"
        />
      </li>
    </ul>
    <p
      v-if="$slots.footer"
      class="shrink-0 border-t border-border p-3 text-xs leading-relaxed text-muted"
    >
      <slot name="footer" />
    </p>
  </div>
</template>
