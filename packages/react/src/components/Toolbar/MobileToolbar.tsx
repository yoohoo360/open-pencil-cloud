import { ChevronLeft, ChevronRight } from 'lucide-react'
import { tv } from 'tailwind-variants'
import type { EditorToolDef, Tool } from '@open-pencil/core/editor'

import { ToolButton } from '#react/components/Toolbar/ToolButton'
import { ToolFlyout } from '#react/components/Toolbar/ToolFlyout'
import type {
  ToolbarActionItem,
  ToolbarUI,
  ToolIconMap,
  ToolLabels
} from '#react/components/Toolbar/types'
import {
  getToolbarToolSelection,
  isToolbarToolActive
} from '#react/primitives/Toolbar/useToolbarState'
import toolbarTheme from '#react/theme/toolbar'

export function MobileToolbar({
  tools,
  activeTool,
  flyoutSelections,
  toolIcons,
  toolLabels,
  toolShortcuts,
  ui,
  mobileCategory,
  hasPrev,
  hasNext,
  editActions,
  arrangeActions,
  onSetTool,
  onPrev,
  onNext,
  onAction
}: {
  tools: EditorToolDef[]
  activeTool: Tool
  flyoutSelections: ReadonlyMap<Tool, Tool>
  toolIcons: ToolIconMap
  toolLabels: ToolLabels
  toolShortcuts: Record<Tool, string>
  ui?: ToolbarUI
  mobileCategory: number
  hasPrev: boolean
  hasNext: boolean
  editActions: ToolbarActionItem[]
  arrangeActions: ToolbarActionItem[]
  onSetTool: (tool: Tool) => void
  onPrev: () => void
  onNext: () => void
  onAction: (item: ToolbarActionItem) => void
}) {
  const styles = tv(toolbarTheme)({ mobile: true })
  const categories = [tools, editActions, arrangeActions] as const
  const current = categories[mobileCategory] ?? tools

  return (
    <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-2 px-3 pb-[env(safe-area-inset-bottom)]">
      <button
        type="button"
        disabled={!hasPrev}
        className={styles.navigationAction({ class: ui?.navigationAction, disabled: !hasPrev })}
        onClick={onPrev}
      >
        <ChevronLeft className={styles.navigationIcon({ class: ui?.navigationIcon })} />
      </button>
      <div
        data-test-id="mobile-toolbar"
        className="flex gap-0.5 rounded-xl bg-panel p-1 shadow-[0_8px_30px_rgb(0_0_0/0.4)]"
      >
        {mobileCategory === 0
          ? (current as EditorToolDef[]).map((tool) =>
              tool.flyout && tool.flyout.length > 1 ? (
                <ToolFlyout
                  key={tool.key}
                  tool={tool}
                  activeTool={activeTool}
                  selectedTool={getToolbarToolSelection(tool, activeTool, flyoutSelections)}
                  toolIcons={toolIcons}
                  toolLabels={toolLabels}
                  toolShortcuts={toolShortcuts}
                  ui={ui}
                  mobile
                  onSelect={onSetTool}
                />
              ) : (
                <ToolButton
                  key={tool.key}
                  icon={toolIcons[tool.key]}
                  label={toolLabels[tool.key]}
                  active={isToolbarToolActive(tool, activeTool)}
                  mobile
                  ui={ui}
                  onClick={() => onSetTool(tool.key)}
                />
              )
            )
          : (current as ToolbarActionItem[]).map((item) => (
              <button
                key={item.label}
                type="button"
                className={styles.action({ class: ui?.action })}
                onClick={() => onAction(item)}
              >
                <item.icon className={styles.actionIcon({ class: ui?.actionIcon })} />
              </button>
            ))}
      </div>
      <button
        type="button"
        disabled={!hasNext}
        className={styles.navigationAction({ class: ui?.navigationAction, disabled: !hasNext })}
        onClick={onNext}
      >
        <ChevronRight className={styles.navigationIcon({ class: ui?.navigationIcon })} />
      </button>
    </div>
  )
}
