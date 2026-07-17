import { useEffect, useState } from 'react'
import { useStore } from '@nanostores/react'

import { AppGroupedSelect } from '@/components/ui/AppGroupedSelect'
import type { ComponentUI } from '@/components/ui/types'
import type { AppGroupedSelectTheme } from '@/theme/app-grouped-select'
import { ACP_AGENTS, AI_PROVIDERS, AUTOMATION_HTTP_PORT, IS_TAURI } from '@open-pencil/core/constants'
import { useAIChat } from '@/app/ai/chat/use'

interface ProviderSelectProps {
  ui?: ComponentUI<AppGroupedSelectTheme>
}

export function ProviderSelect({ ui }: ProviderSelectProps) {
  const { providerID, providerDef } = useAIChat()
  const currentProviderID = useStore(providerID)
  const currentProviderDef = useStore(providerDef)
  const [mcpAvailable, setMcpAvailable] = useState(false)

  useEffect(() => {
    if (!IS_TAURI) return
    async function checkMCPHealth(retries = 3, delayMs = 1000) {
      for (let i = 0; i < retries; i++) {
        try {
          const res = await fetch(`http://127.0.0.1:${AUTOMATION_HTTP_PORT}/health`, {
            signal: AbortSignal.timeout(2000)
          })
          if (res.ok) { setMcpAvailable(true); return }
        } catch (e) {
          console.error('[MCP] health check failed:', e instanceof Error ? e.message : e)
          if (i < retries - 1) await new Promise<void>((resolve) => { setTimeout(resolve, delayMs) })
        }
      }
    }
    void checkMCPHealth()
  }, [])

  const acpAgents = IS_TAURI && mcpAvailable ? ACP_AGENTS : []

  const displayName = currentProviderID.startsWith('acp:')
    ? (ACP_AGENTS.find((a) => a.id === currentProviderID.replace('acp:', ''))?.name ?? currentProviderID)
    : (currentProviderDef as { name?: string }).name ?? currentProviderID

  const groups = [
    ...(acpAgents.length
      ? [{ label: 'Your agents', items: acpAgents.map((a) => ({ value: `acp:${a.id}`, label: a.name })) }]
      : []),
    {
      label: acpAgents.length ? 'API key' : undefined,
      items: AI_PROVIDERS.map((p) => ({ value: p.id, label: p.name }))
    }
  ]

  return (
    <AppGroupedSelect
      value={currentProviderID}
      groups={groups}
      displayValue={displayName}
      ui={ui}
      onChange={(v) => providerID.set(v)}
    />
  )
}
