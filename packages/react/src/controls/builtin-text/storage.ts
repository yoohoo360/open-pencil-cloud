import { RICH_PLUGIN_ID, RICH_PLUGIN_KEY } from '#react/controls/builtin-text/model'

import type { PluginDataEntry } from '@open-pencil/scene-graph'

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
