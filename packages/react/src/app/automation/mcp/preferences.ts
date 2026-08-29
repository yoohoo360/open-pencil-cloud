import { atom } from 'nanostores'

import { IS_BROWSER } from '@open-pencil/core/constants'

import type { MCPToolEffect } from '#react/app/automation/mcp/tools'
import { configurableMCPTools } from '#react/app/automation/mcp/tools'

const DISABLED_TOOLS_STORAGE_KEY = 'open-pencil:mcp:disabled-tools'
const ROOT_DIRECTORY_STORAGE_KEY = 'open-pencil:mcp:root-directory'
const AUTHENTICATION_ENABLED_STORAGE_KEY = 'open-pencil:mcp:authentication-enabled'

function readJSON<T>(key: string, fallback: T, parse: (value: unknown) => T): T {
  if (!IS_BROWSER) return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return parse(JSON.parse(raw) as unknown)
  } catch {
    return fallback
  }
}

function readStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export const disabledMCPTools = atom<string[]>(
  readJSON(DISABLED_TOOLS_STORAGE_KEY, [], readStringList)
)
export const mcpRootDirectory = atom(
  readJSON(ROOT_DIRECTORY_STORAGE_KEY, '', (value) => (typeof value === 'string' ? value : ''))
)
export const mcpAuthenticationEnabled = atom(
  readJSON(AUTHENTICATION_ENABLED_STORAGE_KEY, true, (value) =>
    typeof value === 'boolean' ? value : true
  )
)

disabledMCPTools.subscribe((value) => {
  if (!IS_BROWSER) return
  localStorage.setItem(DISABLED_TOOLS_STORAGE_KEY, JSON.stringify(value))
})

mcpRootDirectory.subscribe((value) => {
  if (!IS_BROWSER) return
  localStorage.setItem(ROOT_DIRECTORY_STORAGE_KEY, JSON.stringify(value))
})

mcpAuthenticationEnabled.subscribe((value) => {
  if (!IS_BROWSER) return
  localStorage.setItem(AUTHENTICATION_ENABLED_STORAGE_KEY, JSON.stringify(value))
})

export function setMCPToolEnabled(name: string, enabled: boolean) {
  const disabled = new Set(disabledMCPTools.get())
  if (enabled) disabled.delete(name)
  else disabled.add(name)
  disabledMCPTools.set([...disabled])
}

export function setMCPToolCategoryEnabled(effect: MCPToolEffect, enabled: boolean) {
  const disabled = new Set(disabledMCPTools.get())
  for (const tool of configurableMCPTools()) {
    if (tool.effect !== effect) continue
    if (enabled) disabled.delete(tool.name)
    else disabled.add(tool.name)
  }
  disabledMCPTools.set([...disabled])
}

export function enableAllMCPTools() {
  disabledMCPTools.set([])
}
