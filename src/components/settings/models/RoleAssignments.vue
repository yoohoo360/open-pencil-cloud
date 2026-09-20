<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@open-pencil/vue'

import { useModelRoleAssignments } from '@/app/ai/models/settings/assignments'
import SettingsGroup from '@/components/settings/layout/SettingsGroup.vue'
import SettingsRow from '@/components/settings/layout/SettingsRow.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

const { ai } = useI18n()

const roleDefinitions = computed(() => [
  {
    role: 'design' as const,
    label: ai.value.modelRoleDesign,
    description: ai.value.modelRoleDesignDescription
  },
  {
    role: 'review' as const,
    label: ai.value.modelRoleReview,
    description: ai.value.modelRoleReviewDescription
  },
  {
    role: 'fast' as const,
    label: ai.value.modelRoleFast,
    description: ai.value.modelRoleFastDescription
  },
  {
    role: 'vision' as const,
    label: ai.value.modelRoleVision,
    description: ai.value.modelRoleVisionDescription
  }
])

const { assignmentValue, optionsForRole, updateAssignment } = useModelRoleAssignments(ai)
</script>

<template>
  <SettingsGroup>
    <SettingsRow
      v-for="definition in roleDefinitions"
      :key="definition.role"
      class="max-sm:flex-col max-sm:items-stretch"
      :label="definition.label"
      :description="definition.description"
      :data-model-role="definition.role"
    >
      <AppSelect
        class="w-full sm:w-52"
        :model-value="assignmentValue(definition.role)"
        :options="optionsForRole(definition.role)"
        :label="definition.label"
        :data-test-id="`settings-model-assignment-${definition.role}`"
        @update:model-value="updateAssignment(definition.role, String($event))"
      />
    </SettingsRow>
  </SettingsGroup>
</template>
