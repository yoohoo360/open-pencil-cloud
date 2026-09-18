import { atom } from 'nanostores'

export type LocalDraftPromptRequest = {
  documentName: string
  resolve: (restore: boolean) => void
}

/** Imperative restore prompt — mounted by LocalDraftRestoreDialog. */
export const localDraftPromptStore = atom<LocalDraftPromptRequest | null>(null)

/** Show the in-app restore dialog; resolves true to restore, false to discard. */
export function promptRestoreLocalDraft(documentName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const previous = localDraftPromptStore.get()
    previous?.resolve(false)
    localDraftPromptStore.set({
      documentName: documentName || 'Untitled',
      resolve: (restore) => {
        localDraftPromptStore.set(null)
        resolve(restore)
      }
    })
  })
}
