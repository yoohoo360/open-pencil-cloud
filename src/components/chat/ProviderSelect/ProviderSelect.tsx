import { memo, useEffect, useMemo, useState } from 'react'

import { promiseTimeout } from '#react/shared/dom/hooks'
import {
  ACP_AGENTS,
  AI_PROVIDERS,
  AUTOMATION_HTTP_PORT,
  IS_TAURI
} from '@open-pencil/core/constants'
import { useAIChat } from '@/app/ai/chat/use'
import AppGroupedSelect from '@/components/ui/AppGroupedSelect'
import { useVueRefValue } from '@/shared/useVueRefValue'

export type ProviderSelectProps = {
  ui?: {
    trigger?: string
    content?: string
    item?: string
    label?: string
    separator?: string
  }
}

export const ProviderSelect = memo(function ProviderSelect({ ui }: ProviderSelectProps) {
  const { providerID: providerIDRef, providerDef: providerDefRef } = useAIChat()
  const providerID = useVueRefValue(providerIDRef)
  const providerDef = useVueRefValue(providerDefRef)
  const [mcpAvailable, setMcpAvailable] = useState(false)

  useEffect(() => {
    if (!IS_TAURI) return
    let cancelled = false

    async function checkMCPHealth(retries = 3, delayMs = 1000) {
      for (let i = 0; i < retries; i++) {
        try {
          const res = await fetch(`http://127.0.0.1:${AUTOMATION_HTTP_PORT}/health`, {
            signal: AbortSignal.timeout(2000)
          })
          if (res.ok) {
            if (!cancelled) setMcpAvailable(true)
            return
          }
        } catch (error) {
          console.error(
            '[MCP] health check failed (attempt',
            i + 1,
            '):',
            error instanceof Error ? error.message : error
          )
          if (i < retries - 1) await promiseTimeout(delayMs)
        }
      }
    }

    void checkMCPHealth()
    return () => {
      cancelled = true
    }
  }, [])

  const acpAgents = IS_TAURI && mcpAvailable ? ACP_AGENTS : []

  const displayName = useMemo(() => {
    if (providerID.startsWith('acp:')) {
      const agentId = providerID.replace('acp:', '')
      return ACP_AGENTS.find((a) => a.id === agentId)?.name ?? providerID
    }
    return providerDef.name
  }, [providerDef.name, providerID])

  const groups = useMemo(() => {
    const result: Array<{ label?: string; items: Array<{ value: string; label: string }> }> = []

    if (acpAgents.length) {
      result.push({
        label: 'Your agents',
        items: acpAgents.map((agent) => ({
          value: `acp:${agent.id}`,
          label: agent.name
        }))
      })
    }

    result.push({
      label: acpAgents.length ? 'API key' : undefined,
      items: AI_PROVIDERS.map((provider) => ({
        value: provider.id,
        label: provider.name
      }))
    })

    return result
  }, [acpAgents])

  return (
    <AppGroupedSelect
      value={providerID}
      onValueChange={(value) => {
        providerIDRef.value = value
      }}
      groups={groups}
      displayValue={displayName}
      ui={ui}
    />
  )
})

ProviderSelect.displayName = 'ProviderSelect'
export default ProviderSelect
