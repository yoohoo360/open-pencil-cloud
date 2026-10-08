import { RICH_IMAGE_MAP_KEY, RICH_PLUGIN_ID, RICH_PLUGIN_KEY } from '#react/controls/builtin-text/model'

import type { PluginDataEntry } from '@open-pencil/scene-graph'

/** URL / OSS path → document image hash. */
export type RichImageMap = Record<string, string>

export function readRichMarkdown(pluginData: PluginDataEntry[]): string {
  const entry = pluginData.find(
    (item) => item.pluginId === RICH_PLUGIN_ID && item.key === RICH_PLUGIN_KEY
  )
  if (!entry?.value) return ''
  if (entry.value.startsWith('{')) {
    try {
      const parsed = JSON.parse(entry.value) as { markdown?: string }
      if (typeof parsed.markdown === 'string') return parsed.markdown
    } catch {
      return entry.value
    }
  }
  return entry.value
}

export function writeRichMarkdown(
  pluginData: PluginDataEntry[],
  markdown: string
): PluginDataEntry[] {
  return [
    ...pluginData.filter(
      (item) => item.pluginId !== RICH_PLUGIN_ID || item.key !== RICH_PLUGIN_KEY
    ),
    { pluginId: RICH_PLUGIN_ID, key: RICH_PLUGIN_KEY, value: markdown }
  ]
}

export function readRichImageMap(pluginData: PluginDataEntry[]): RichImageMap {
  const entry = pluginData.find(
    (item) => item.pluginId === RICH_PLUGIN_ID && item.key === RICH_IMAGE_MAP_KEY
  )
  if (!entry?.value) return {}
  try {
    const parsed = JSON.parse(entry.value) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const map: RichImageMap = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (key && typeof value === 'string' && value) map[key] = value
    }
    return map
  } catch {
    return {}
  }
}

export function writeRichImageMap(
  pluginData: PluginDataEntry[],
  map: RichImageMap
): PluginDataEntry[] {
  const cleaned: RichImageMap = {}
  for (const [key, value] of Object.entries(map)) {
    if (key && value) cleaned[key] = value
  }
  const without = pluginData.filter(
    (item) => item.pluginId !== RICH_PLUGIN_ID || item.key !== RICH_IMAGE_MAP_KEY
  )
  if (Object.keys(cleaned).length === 0) return without
  return [
    ...without,
    { pluginId: RICH_PLUGIN_ID, key: RICH_IMAGE_MAP_KEY, value: JSON.stringify(cleaned) }
  ]
}

export function mergeRichImageMap(
  pluginData: PluginDataEntry[],
  updates: RichImageMap
): PluginDataEntry[] {
  if (Object.keys(updates).length === 0) return pluginData
  return writeRichImageMap(pluginData, { ...readRichImageMap(pluginData), ...updates })
}

export function resolveImageHash(
  map: RichImageMap,
  ...keys: Array<string | undefined | null>
): string {
  for (const key of keys) {
    if (!key) continue
    const hash = map[key]
    if (hash) return hash
  }
  return ''
}
