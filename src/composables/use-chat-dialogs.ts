import { dialogMessages } from '@open-pencil/react'

/**
 * Framework-agnostic chat dialog strings for leftover Vue Chat SFCs.
 * Reads the live nanostore so locale changes still apply.
 */
export function useChatDialogs() {
  return dialogMessages.get()
}
