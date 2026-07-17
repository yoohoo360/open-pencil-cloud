import type { Tool } from '@open-pencil/react'
import type { EditorToolDef } from '@open-pencil/core/editor'
import type { ToolbarUI, ToolIconMap, ToolLabels, ToolbarActionItem } from './types'
import { ToolFlyout } from './ToolFlyout'
import { ToolButton } from './ToolButton'
import { ToolbarItem, toolbarToolTestId } from '@open-pencil/react'

export interface MobileToolbarProps {
  tools: EditorToolDef[]
  activeTool: Tool
  toolIcons: ToolIconMap
  toolLabels: ToolLabels
  toolShortcuts: Record<Tool, string>
  ui?: ToolbarUI
  mobileCategory: string
  slideDirection: string
  hasPrev: boolean
  hasNext: boolean
  editActions: ToolbarActionItem[]
  arrangeActions: ToolbarActionItem[]
  onSetTool?: (tool: Tool) => void
  onPrev?: () => void
  onNext?: () => void
  onAction?: (item: ToolbarActionItem) => void
}

export function MobileToolbar({
  tools,
  activeTool,
  toolIcons,
  toolLabels,
  toolShortcuts,
  ui,
  onSetTool
}: MobileToolbarProps) {
  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2">
      <div
        data-test-id="mobile-toolbar"
        className="flex gap-0.5 rounded-xl border border-border bg-panel p-1 shadow-lg"
      >
        {tools.map((tool) => {
          const flyout = tool.flyout ?? []
          if (flyout.length > 1) {
            return (
              <ToolFlyout
                key={tool.key}
                tool={tool}
                activeTool={activeTool}
                toolIcons={toolIcons}
                toolLabels={toolLabels}
                toolShortcuts={toolShortcuts}
                ui={ui}
                mobile
                onSelect={onSetTool}
              />
            )
          }
          return (
            <ToolbarItem key={tool.key} tool={tool.key}>
              {({ active, actions }) => (
                <ToolButton
                  data-test-id={toolbarToolTestId(tool.key, true)}
                  icon={toolIcons[tool.key]}
                  active={active}
                  mobile
                  onClick={() => actions.select()}
                />
              )}
            </ToolbarItem>
          )
        })}
      </div>
    </div>
  )
}
