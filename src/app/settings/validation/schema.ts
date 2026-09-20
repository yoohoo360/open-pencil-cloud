import * as v from 'valibot'

export interface SettingsValidationMessages {
  requiredField: string
  invalidURL: string
}

export function requiredSetting(message: string) {
  return v.pipe(v.string(), v.trim(), v.nonEmpty(message))
}

export function validSettingsURL(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
  } catch {
    return false
  }
}

export function requiredSettingsURL(messages: SettingsValidationMessages) {
  return v.pipe(
    requiredSetting(messages.requiredField),
    v.check(validSettingsURL, messages.invalidURL)
  )
}
