import * as v from 'valibot'
import { computed, ref, type Ref } from 'vue'

import {
  requiredSetting,
  requiredSettingsURL,
  validSettingsURL,
  type SettingsValidationMessages
} from '@/app/settings/validation/schema'
import { useSettingsValidation } from '@/app/settings/validation/use'

import type { StoragePreferenceField } from '../types'
import type { useStorageSettings } from './use'

function preferenceSchema(field: StoragePreferenceField, messages: SettingsValidationMessages) {
  if (field.kind !== 'url')
    return field.required ? requiredSetting(messages.requiredField) : v.string()
  if (field.required) return requiredSettingsURL(messages)
  return v.pipe(
    v.string(),
    v.check((value) => !value.trim() || validSettingsURL(value), messages.invalidURL)
  )
}

export function useStorageSettingsFeedback(
  connection: ReturnType<typeof useStorageSettings>,
  credentials: Readonly<Ref<Record<string, string>>>,
  messages: Readonly<Ref<SettingsValidationMessages>>
) {
  const testing = ref(false)
  const values = computed(() => ({
    ...Object.fromEntries(
      connection.provider.value.preferenceFields.map((field) => [
        field.id,
        connection.preferenceDrafts.value[field.id] ?? ''
      ])
    ),
    ...Object.fromEntries(
      connection.provider.value.credentialFields.map((field) => [
        `credential:${field.id}`,
        Boolean(
          credentials.value[field.id]?.trim() ||
          connection.credentialStatuses.value[field.id] === 'configured'
        )
      ])
    )
  }))
  const schema = computed(() =>
    v.object({
      ...Object.fromEntries(
        connection.provider.value.preferenceFields.map((field) => [
          field.id,
          preferenceSchema(field, messages.value)
        ])
      ),
      ...Object.fromEntries(
        connection.provider.value.credentialFields.map((field) => [
          `credential:${field.id}`,
          testing.value && field.required
            ? v.pipe(
                v.boolean(),
                v.check((value: boolean) => value, messages.value.requiredField)
              )
            : v.boolean()
        ])
      )
    })
  )
  const validation = useSettingsValidation(values, schema)
  return {
    ...validation,
    async validate(intent: 'save' | 'test') {
      testing.value = intent === 'test'
      return validation.validate()
    }
  }
}
