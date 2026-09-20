<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@open-pencil/vue'

import { reasoningDisplay } from '@/app/ai/chat/preferences'
import SettingsGroup from '@/components/settings/layout/SettingsGroup.vue'
import SettingsRow from '@/components/settings/layout/SettingsRow.vue'
import SettingsSection from '@/components/settings/layout/SettingsSection.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

const { ai } = useI18n()
const options = computed(() => [
  { value: 'collapsed' as const, label: ai.value.reasoningCollapsed },
  { value: 'while-thinking' as const, label: ai.value.reasoningWhileThinking },
  { value: 'expanded' as const, label: ai.value.reasoningExpanded }
])
</script>

<template>
  <SettingsSection>
    <template #title>{{ ai.chatSettings }}</template>
    <SettingsGroup>
      <SettingsRow :label="ai.reasoningDisplay" class="max-sm:flex-col max-sm:items-stretch">
        <AppSelect
          v-model="reasoningDisplay"
          :label="ai.reasoningDisplay"
          :options="options"
          :ui="{ trigger: 'w-full sm:w-52' }"
        />
      </SettingsRow>
    </SettingsGroup>
  </SettingsSection>
</template>
