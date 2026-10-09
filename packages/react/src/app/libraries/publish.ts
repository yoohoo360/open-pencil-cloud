import { atom } from 'nanostores'

export const publishLibraryDialogOpen = atom(false)

export function openPublishLibraryDialog(): void {
  publishLibraryDialogOpen.set(true)
}

export function closePublishLibraryDialog(): void {
  publishLibraryDialogOpen.set(false)
}
