import { memo } from 'react'

import { toolbarToolTestId, ToolbarItem, type Tool } from '@open-pencil/react'
import type { EditorToolDef } from '@open-pencil/core/editor'
import Tip from '@/components/ui/Tip'
import ToolButton from '@/components/Toolbar/ToolButton'
import ToolFlyout from '@/components/Toolbar/ToolFlyout'
import type { ToolbarUI, ToolIconMap, ToolLabels } from '@/components/Toolbar/types'

export type DesktopToolbarProps = {
  tools: EditorToolDef[]
  activeTool: Tool
  toolIcons: ToolIconMap
  toolLabels: ToolLabels
  toolShortcuts: Record<Tool, string>
  ui?: ToolbarUI
  onSetTool: (tool: Tool) => void
}

export const DesktopToolbar = memo(function DesktopToolbar({
  tools,
  activeTool,
  toolIcons,
  toolLabels,
  toolShortcuts,
  ui,
  onSetTool
}: DesktopToolbarProps) {
  const isActive = (tool: EditorToolDef) =>
    tool.key === activeTool || (tool.flyout?.includes(activeTool) ?? false)

  const activeKeyForTool = (tool: EditorToolDef) =>
    tool.flyout?.includes(activeTool) ? activeTool : tool.key

  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center">
      <div
        data-test-id="toolbar"
        className="flex gap-0.5 rounded-xl bg-panel p-1 shadow-[0_8px_30px_rgb(0_0_0/0.4)]"
      >
        {tools.map((tool) =>
          tool.flyout && tool.flyout.length > 1 ? (
            <Tip
              key={tool.key}
              label={`${toolLabels[activeKeyForTool(tool)]} (${tool.shortcut})`}
            >
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
          ) : (
            <ToolbarItem key={tool.key} tool={tool.key}>
              {({ active, actions }) => (
                <Tip label={`${toolLabels[tool.key]} (${tool.shortcut})`}>
                  <ToolButton
                    data-test-id={toolbarToolTestId(tool.key)}
                    icon={toolIcons[tool.key]}
                    label={toolLabels[tool.key]}
                    active={active || isActive(tool)}
                    ui={ui}
                    onClick={actions.select}
                  />
                </Tip>
              )}
            </ToolbarItem>
          )
        )}
      </div>
    </div>
  )
})

DesktopToolbar.displayName = 'DesktopToolbar'
export default DesktopToolbar
