<script setup lang="ts">
import { useSettingsMessages } from '@open-pencil/vue'

import { webmcpMode } from '@/app/automation/webmcp/preferences'
import { webmcpRuntime } from '@/app/automation/webmcp/runtime'
import SettingsSection from '@/components/settings/layout/SettingsSection.vue'

import MCPConnectionsSection from './MCPConnectionsSection.vue'
import MCPSettingsPanel from './MCPSettingsPanel.vue'
import WebMCPSettingsPanel from './WebMCPSettingsPanel.vue'

const settings = useSettingsMessages()
</script>

<template>
  <div class="flex min-h-0 min-w-0 flex-1 flex-col" data-test-id="settings-mcp-panel">
    <MCPConnectionsSection>
      <SettingsSection>
        <template #title>{{ settings.automation }}</template>
        <div class="flex flex-col gap-6">
          <MCPSettingsPanel />
          <WebMCPSettingsPanel v-model="webmcpMode" :state="webmcpRuntime" />
        </div>
      </SettingsSection>
    </MCPConnectionsSection>
  </div>
</template>
