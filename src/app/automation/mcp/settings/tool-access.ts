import { computed, ref, type Ref } from 'vue'

import type { ToolDescriptor, ToolEffect } from '@open-pencil/mcp/tools'

/** Tool access is derived from the catalog and one controlled disabled-name model. */
export function useMCPToolAccess(tools: Readonly<Ref<ToolDescriptor[]>>, disabled: Ref<string[]>) {
  const search = ref('')
  const disabledNames = computed(() => new Set(disabled.value))
  const enabledCount = computed(() => tools.value.filter(isEnabled).length)
  const visibleTools = computed(() => {
    const query = search.value.trim().toLowerCase()
    return tools.value.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query) || tool.description.toLowerCase().includes(query)
    )
  })

  function isEnabled(tool: ToolDescriptor) {
    return !disabledNames.value.has(tool.name)
  }

  function setEnabled(names: string[], enabled: boolean) {
    const next = new Set(disabled.value)
    for (const name of names) {
      if (enabled) next.delete(name)
      else next.add(name)
    }
    disabled.value = [...next]
  }

  function category(effect: ToolEffect) {
    const members = computed(() => tools.value.filter((tool) => tool.effect === effect))
    const count = computed(() => members.value.filter(isEnabled).length)
    return {
      enabled: computed({
        get: () => count.value > 0,
        set: (enabled: boolean) =>
          setEnabled(
            members.value.map((tool) => tool.name),
            enabled
          )
      }),
      state: computed(() =>
        count.value > 0 && count.value < members.value.length ? 'mixed' : 'idle'
      )
    }
  }

  const { enabled: inspectionEnabled, state: inspectionState } = category('read')
  const { enabled: modificationEnabled, state: modificationState } = category('write')

  return {
    search,
    visibleTools,
    enabledCount,
    inspectionEnabled,
    inspectionState,
    modificationEnabled,
    modificationState,
    isEnabled,
    setToolEnabled: (name: string, enabled: boolean) => setEnabled([name], enabled)
  }
}
