import { atom } from 'nanostores'

import type { TailwindConfigLike } from '#core/io/formats/jsx'

import {
  clearTailwindConfigList,
  readTailwindConfigList,
  writeTailwindConfigList,
  writeTailwindConfigs,
  type TailwindConfigEntry,
  type TailwindConfigList
} from '#react/app/code/tailwind-config/idb'

/** Ordered high → low priority configs for prototype → Tailwind JSX generation. */
export const tailwindConfigStore = atom<TailwindConfigList>({ version: 1, configs: [] })

let hydratePromise: Promise<void> | null = null

/** Load config list from IndexedDB once; safe to call repeatedly. */
export function hydrateTailwindConfig(): Promise<void> {
  if (!hydratePromise) {
    hydratePromise = readTailwindConfigList()
      .then((list) => {
        tailwindConfigStore.set(list)
      })
      .catch((error) => {
        hydratePromise = null
        console.warn('[TailwindConfig] Failed to hydrate', error)
      })
  }
  return hydratePromise
}

/** Config objects in priority order (index 0 wins; defaults last). */
export function getTailwindConfigsInPriorityOrder(): TailwindConfigLike[] {
  return tailwindConfigStore.get().configs.map((entry) => entry.config)
}

export async function saveTailwindConfigList(list: TailwindConfigList): Promise<void> {
  await writeTailwindConfigList(list)
  tailwindConfigStore.set({ version: 1, configs: list.configs })
}

/** Replace all configs from plain objects (index 0 = highest priority). */
export async function saveTailwindConfigs(configs: TailwindConfigLike[]): Promise<void> {
  const list = await writeTailwindConfigs(configs)
  tailwindConfigStore.set(list)
}

export async function clearTailwindConfigs(): Promise<void> {
  await clearTailwindConfigList()
  tailwindConfigStore.set({ version: 1, configs: [] })
}

/** @deprecated Prefer saveTailwindConfigs. Saves a single highest-priority config. */
export async function saveTailwindConfig(config: TailwindConfigLike | null): Promise<void> {
  if (!config) {
    await clearTailwindConfigs()
    return
  }
  await saveTailwindConfigs([config])
}

export type { TailwindConfigEntry, TailwindConfigList }
export {
  readTailwindConfigList,
  writeTailwindConfigList,
  writeTailwindConfigs,
  clearTailwindConfigList
}
