import { atom } from 'nanostores'

export const settingsDialogOpen = atom(false)

export function openSettingsDialog() {
  settingsDialogOpen.set(true)
}

export function closeSettingsDialog() {
  settingsDialogOpen.set(false)
}
