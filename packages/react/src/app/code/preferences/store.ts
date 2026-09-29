import { atom } from 'nanostores'

import type { CodeSource } from '#react/app/code/templates'
import {
  readCodePanelPreferences,
  writeCodePanelPreferences,
  type CodePanelPreferences
} from '#react/app/code/preferences/idb'

export const codePanelPreferencesStore = atom<CodePanelPreferences>({
  version: 1,
  source: 'design-jsx'
})

let hydratePromise: Promise<void> | null = null

export function hydrateCodePanelPreferences(): Promise<void> {
  if (!hydratePromise) {
    hydratePromise = readCodePanelPreferences()
      .then((prefs) => {
        codePanelPreferencesStore.set(prefs)
      })
      .catch((error) => {
        hydratePromise = null
        console.warn('[CodePreferences] Failed to hydrate', error)
      })
  }
  return hydratePromise
}

export async function setCodePanelSource(source: CodeSource): Promise<void> {
  const next: CodePanelPreferences = { version: 1, source }
  codePanelPreferencesStore.set(next)
  try {
    await writeCodePanelPreferences(next)
  } catch (error) {
    console.warn('[CodePreferences] Failed to save', error)
  }
}
