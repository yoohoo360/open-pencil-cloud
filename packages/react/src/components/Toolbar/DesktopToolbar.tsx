import type { EditorToolDef, Tool } from '@open-pencil/core/editor'

import { Tip } from '#react/components/ui/Tip'
import { ToolButton } from '#react/components/Toolbar/ToolButton'
import { ToolFlyout } from '#react/components/Toolbar/ToolFlyout'
import type { ToolbarUI, ToolIconMap, ToolLabels } from '#react/components/Toolbar/types'
import { ToolbarItem } from '#react/primitives/Toolbar/ToolbarRoot'
import {
  getToolbarToolSelection,
  isToolbarToolActive
} from '#react/primitives/Toolbar/useToolbarState'
import { toolbarToolTestId } from '#react/testing/test-id'

export function DesktopToolbar({
  tools,
  activeTool,
  flyoutSelections,
  toolIcons,
  toolLabels,
  toolShortcuts,
  ui,
  onSetTool
}: {
  tools: EditorToolDef[]
  activeTool: Tool
  flyoutSelections: ReadonlyMap<Tool, Tool>
  toolIcons: ToolIconMap
  toolLabels: ToolLabels
  toolShortcuts: Record<Tool, string>
  ui?: ToolbarUI
  onSetTool: (tool: Tool) => void
}) {
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
              label={`${toolLabels[getToolbarToolSelection(tool, activeTool, flyoutSelections)]} (${tool.shortcut})`}
            >
              <ToolFlyout
                tool={tool}
                activeTool={activeTool}
                selectedTool={getToolbarToolSelection(tool, activeTool, flyoutSelections)}
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
                    active={active || isToolbarToolActive(tool, activeTool)}
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
}
