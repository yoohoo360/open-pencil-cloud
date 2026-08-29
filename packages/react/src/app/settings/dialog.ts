import { atom } from 'nanostores'

export type SettingsSection = 'general' | 'ai' | 'mcp'

export const settingsDialogOpen = atom(false)
export const settingsDialogSection = atom<SettingsSection>('general')

export function openSettingsDialog(section?: SettingsSection) {
  if (section) settingsDialogSection.set(section)
  settingsDialogOpen.set(true)
}

export function closeSettingsDialog() {
  settingsDialogOpen.set(false)
}
