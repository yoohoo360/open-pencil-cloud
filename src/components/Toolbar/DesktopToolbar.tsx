import { ToolbarItem, toolbarToolTestId } from '@open-pencil/react'
import type { Tool } from '@open-pencil/react'
import type { EditorToolDef } from '@open-pencil/core/editor'

import { Tip } from '@/components/ui/Tip'
import { ToolButton } from './ToolButton'
import { ToolFlyout } from './ToolFlyout'
import type { ToolbarUI, ToolIconMap, ToolLabels } from './types'

export interface DesktopToolbarProps {
  tools: EditorToolDef[]
  activeTool: Tool
  toolIcons: ToolIconMap
  toolLabels: ToolLabels
  toolShortcuts: Record<Tool, string>
  ui?: ToolbarUI
  onSetTool?: (tool: Tool) => void
}

export function DesktopToolbar({
  tools,
  activeTool,
  toolIcons,
  toolLabels,
  toolShortcuts,
  ui,
  onSetTool
}: DesktopToolbarProps) {
  function isActive(tool: EditorToolDef) {
    return tool.key === activeTool || (tool.flyout?.includes(activeTool) ?? false)
  }

  function activeKeyForTool(tool: EditorToolDef): Tool {
    return tool.flyout?.includes(activeTool) ? activeTool : tool.key
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center">
      <div
        data-test-id="toolbar"
        className="flex gap-0.5 rounded-xl border border-border bg-panel p-1 shadow-lg"
      >
        {tools.map((tool) => {
          const flyout = tool.flyout ?? []
          if (flyout.length > 1) {
            return (
              <Tip key={tool.key} label={`${toolLabels[activeKeyForTool(tool)]} (${tool.shortcut})`}>
                <ToolFlyout
                  tool={tool}
                  activeTool={activeTool}
                  toolIcons={toolIcons}
                  toolLabels={toolLabels}
                  toolShortcuts={toolShortcuts}
                  ui={ui}
                  onSelect={onSetTool}
                />
              </Tip>
            )
          }

          return (
            <ToolbarItem key={tool.key} tool={tool.key}>
              {({ active, actions }) => (
                <Tip label={`${toolLabels[tool.key]} (${tool.shortcut})`}>
                  <ToolButton
                    data-test-id={toolbarToolTestId(tool.key)}
                    icon={toolIcons[tool.key]}
                    active={active || isActive(tool)}
                    onClick={() => actions.select()}
                  />
                </Tip>
              )}
            </ToolbarItem>
          )
        })}
      </div>
    </div>
  )
}
