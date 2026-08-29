import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@nanostores/react'

import {
  disabledMCPTools,
  enableAllMCPTools,
  mcpAuthenticationEnabled,
  mcpRootDirectory,
  setMCPToolCategoryEnabled,
  setMCPToolEnabled
} from '#react/app/automation/mcp/preferences'
import { mcpRuntime, refreshMCPRuntime, restartMCPRuntime } from '#react/app/automation/mcp/runtime'
import { configurableMCPTools, type MCPToolEffect } from '#react/app/automation/mcp/tools'
import { AppInput } from '#react/components/ui/AppInput'
import { AppSwitch } from '#react/components/ui/AppSwitch'
import { useI18n } from '#react/i18n'

function categoryStatus(effect: MCPToolEffect, disabled: ReadonlySet<string>) {
  const tools = configurableMCPTools().filter((tool) => tool.effect === effect)
  const enabled = tools.filter((tool) => !disabled.has(tool.name)).length
  return {
    enabled: enabled > 0,
    state: enabled > 0 && enabled < tools.length ? ('mixed' as const) : ('idle' as const)
  }
}

export function MCPSettingsPanel() {
  const { dialogs } = useI18n()
  const runtime = useStore(mcpRuntime)
  const disabledTools = useStore(disabledMCPTools)
  const authenticationEnabled = useStore(mcpAuthenticationEnabled)
  const rootDirectory = useStore(mcpRootDirectory)
  const [toolSearch, setToolSearch] = useState('')
  const tools = useMemo(() => configurableMCPTools(), [])
  const disabledToolNames = useMemo(() => new Set(disabledTools), [disabledTools])
  const inspectionToolsStatus = categoryStatus('read', disabledToolNames)
  const modificationToolsStatus = categoryStatus('write', disabledToolNames)
  const enabledToolCount = tools.filter((tool) => !disabledToolNames.has(tool.name)).length
  const query = toolSearch.trim().toLowerCase()
  const visibleTools = query
    ? tools.filter(
        (tool) =>
          tool.name.toLowerCase().includes(query) || tool.description.toLowerCase().includes(query)
      )
    : tools
  const statusLabel =
    runtime.status === 'idle'
      ? dialogs.mcpStatus_idle
      : runtime.status === 'starting'
        ? dialogs.mcpStatus_starting
        : runtime.status === 'running'
          ? dialogs.mcpStatus_running
          : runtime.status === 'error'
            ? dialogs.mcpStatus_error
            : dialogs.mcpStatus_stopped

  useEffect(() => {
    void refreshMCPRuntime()
  }, [])

  return (
    <section className="flex flex-col gap-4" data-test-id="settings-mcp-automation-panel">
      <div>
        <h3 className="text-xs font-semibold text-surface">{dialogs.settingsMCP}</h3>
        <p className="mt-1 text-[11px] text-muted">{dialogs.mcpDescription}</p>
      </div>

      <div className="rounded border border-border bg-panel p-3 text-[11px]">
        <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2">
          <dt className="text-muted">{dialogs.mcpStatus}</dt>
          <dd className="flex items-center gap-2 text-surface">
            <span
              className={`size-2 rounded-full ${
                runtime.status === 'running'
                  ? 'bg-green-500'
                  : runtime.status === 'error'
                    ? 'bg-red-500'
                    : 'bg-muted'
              }`}
            />
            {statusLabel}
          </dd>
          <dt className="text-muted">{dialogs.mcpPort}</dt>
          <dd className="font-mono text-surface">{runtime.port}</dd>
          <dt className="text-muted">{dialogs.mcpAddress}</dt>
          <dd className="select-all font-mono text-surface">127.0.0.1</dd>
          {runtime.version ? (
            <>
              <dt className="text-muted">{dialogs.mcpVersion}</dt>
              <dd className="font-mono text-surface">{runtime.version}</dd>
            </>
          ) : null}
        </dl>

        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium text-surface">{dialogs.mcpAuthentication}</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                {dialogs.mcpAuthenticationDescription}
              </p>
            </div>
            <AppSwitch
              checked={authenticationEnabled}
              label={dialogs.mcpAuthentication}
              data-test-id="settings-mcp-authentication"
              onCheckedChange={(enabled) => mcpAuthenticationEnabled.set(enabled)}
            />
          </div>
        </div>

        <div className="mt-3 border-t border-border pt-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-surface">{dialogs.mcpRootDirectory}</p>
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted">
              {rootDirectory || dialogs.mcpRootDirectoryDefault}
            </p>
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
            {dialogs.mcpRootDirectoryDescription}
          </p>
        </div>
      </div>

      {runtime.error ? (
        <p className="rounded border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-400">
          {runtime.error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded border border-border bg-panel">
        <div className="flex items-start justify-between gap-4 border-b border-border p-3">
          <div>
            <h4 className="text-[11px] font-medium text-surface">{dialogs.mcpTools}</h4>
            <p className="mt-0.5 text-[10px] text-muted">
              {dialogs.mcpToolsEnabled({ enabled: enabledToolCount, total: tools.length })}
            </p>
          </div>
          {disabledTools.length > 0 ? (
            <button
              type="button"
              className="text-[10px] text-accent hover:underline"
              onClick={enableAllMCPTools}
            >
              {dialogs.mcpEnableAllTools}
            </button>
          ) : null}
        </div>

        <div className="border-b border-border p-2">
          <AppInput
            type="search"
            tone="default"
            size="sm"
            value={toolSearch}
            placeholder={dialogs.search}
            aria-label={dialogs.mcpSearchTools}
            data-test-id="settings-mcp-tool-search"
            onChange={(event) => setToolSearch(event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 border-b border-border p-2.5">
          <div className="flex items-center justify-between gap-2 rounded bg-input px-2.5 py-2">
            <span className="text-[10px] text-surface">{dialogs.mcpReadOnlyTools}</span>
            <AppSwitch
              checked={inspectionToolsStatus.enabled}
              state={inspectionToolsStatus.state}
              label={dialogs.mcpReadOnlyTools}
              data-test-id="settings-mcp-inspection-tools"
              onCheckedChange={(enabled) => setMCPToolCategoryEnabled('read', enabled)}
            />
          </div>
          <div className="flex items-center justify-between gap-2 rounded bg-input px-2.5 py-2">
            <span className="text-[10px] text-surface">{dialogs.mcpSideEffectTools}</span>
            <AppSwitch
              checked={modificationToolsStatus.enabled}
              state={modificationToolsStatus.state}
              label={dialogs.mcpSideEffectTools}
              data-test-id="settings-mcp-modification-tools"
              onCheckedChange={(enabled) => setMCPToolCategoryEnabled('write', enabled)}
            />
          </div>
        </div>

        <ul className="max-h-72 divide-y divide-border overflow-y-auto">
          {visibleTools.map((tool) => (
            <li key={tool.name} className="flex items-start gap-3 p-2.5">
              <div className="min-w-0 flex-1">
                <code className="text-[10px] font-medium text-surface">{tool.name}</code>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{tool.description}</p>
              </div>
              <AppSwitch
                checked={!disabledToolNames.has(tool.name)}
                label={tool.name}
                data-test-id={`settings-mcp-tool-${tool.name}`}
                onCheckedChange={(enabled) => setMCPToolEnabled(tool.name, enabled)}
              />
            </li>
          ))}
        </ul>

        <p className="border-t border-border px-3 py-2 text-[10px] text-muted">
          {runtime.externallyManaged
            ? dialogs.mcpExternalRestartNotice
            : dialogs.mcpToolsRestartNotice}
        </p>
      </div>

      <div>
        <button
          type="button"
          className="rounded bg-accent px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          disabled={runtime.status === 'starting' || runtime.externallyManaged}
          data-test-id="settings-mcp-restart"
          onClick={() => void restartMCPRuntime()}
        >
          {runtime.status === 'starting' || runtime.checking
            ? dialogs.mcpStarting
            : runtime.externallyManaged
              ? dialogs.mcpExternallyManaged
              : dialogs.mcpRestart}
        </button>
      </div>
    </section>
  )
}
