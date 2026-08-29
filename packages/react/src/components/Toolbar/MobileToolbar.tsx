import { ChevronLeft, ChevronRight } from 'lucide-react'
import { tv } from 'tailwind-variants'
import type { EditorToolDef, Tool } from '@open-pencil/core/editor'

import { Tip } from '#react/components/ui/Tip'
import { ToolButton } from '#react/components/Toolbar/ToolButton'
import { ToolFlyout } from '#react/components/Toolbar/ToolFlyout'
import { ToolbarActionGroup } from '#react/components/Toolbar/ToolbarActionGroup'
import type {
  ToolbarActionItem,
  ToolbarUI,
  ToolIconMap,
  ToolLabels
} from '#react/components/Toolbar/types'
import { ToolbarItem } from '#react/primitives/Toolbar/ToolbarRoot'
import { getToolbarToolSelection } from '#react/primitives/Toolbar/useToolbarState'
import { toolbarToolTestId } from '#react/testing/test-id'
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
  slideDirection,
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
  slideDirection: number
  hasPrev: boolean
  hasNext: boolean
  editActions: ToolbarActionItem[]
  arrangeActions: ToolbarActionItem[]
  onSetTool: (tool: Tool) => void
  onPrev: () => void
  onNext: () => void
  onAction: (item: ToolbarActionItem) => void
}) {
  const toolbar = tv(toolbarTheme)
  const styles = toolbar({ mobile: true })
  const slideClass =
    slideDirection >= 0 ? 'animate-in fade-in slide-in-from-right-2' : 'animate-in fade-in slide-in-from-left-2'

  function navigationClass(disabled: boolean) {
    return toolbar({ disabled, mobile: true }).navigationAction({ class: ui?.navigationAction })
  }

  return (
    <div
      data-test-id="mobile-toolbar"
      className="fixed left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5"
      style={{
        maxWidth: 'calc(100vw - 2rem)',
        bottom: 'calc(56px + env(safe-area-inset-bottom) + 0.75rem)'
      }}
    >
      <button
        type="button"
        data-test-id="mobile-toolbar-prev"
        disabled={!hasPrev}
        data-disabled={!hasPrev || undefined}
        className={navigationClass(!hasPrev)}
        style={{ opacity: hasPrev ? 1 : 0 }}
        onClick={onPrev}
      >
        <ChevronLeft className={styles.navigationIcon({ class: ui?.navigationIcon })} />
      </button>

      <div
        data-test-id="mobile-toolbar-container"
        className="relative flex h-11 items-center overflow-hidden rounded-[8px] border border-border bg-panel px-2 shadow-lg"
      >
        {mobileCategory === 0 ? (
          <div data-test-id="mobile-toolbar-tools" className={`flex gap-0.5 ${slideClass}`}>
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
                    mobile
                    onSelect={onSetTool}
                  />
                </Tip>
              ) : (
                <ToolbarItem key={tool.key} tool={tool.key}>
                  {({ active, actions }) => (
                    <Tip label={`${toolLabels[tool.key]} (${tool.shortcut})`}>
                      <ToolButton
                        mobile
                        data-test-id={toolbarToolTestId(tool.key, true)}
                        icon={toolIcons[tool.key]}
                        label={toolLabels[tool.key]}
                        active={
                          active ||
                          getToolbarToolSelection(tool, activeTool, flyoutSelections) === activeTool
                        }
                        ui={ui}
                        onClick={actions.select}
                      />
                    </Tip>
                  )}
                </ToolbarItem>
              )
            )}
          </div>
        ) : null}

        {mobileCategory === 1 ? (
          <div data-test-id="mobile-toolbar-edit" className={`flex gap-0.5 ${slideClass}`}>
            <ToolbarActionGroup
              actions={editActions}
              ui={ui}
              testPrefix="mobile-toolbar"
              onAction={onAction}
            />
          </div>
        ) : null}

        {mobileCategory === 2 ? (
          <div data-test-id="mobile-toolbar-arrange" className={`flex gap-0.5 ${slideClass}`}>
            <ToolbarActionGroup
              actions={arrangeActions}
              ui={ui}
              testPrefix="mobile-toolbar"
              onAction={onAction}
            />
          </div>
        ) : null}
      </div>

      <button
        type="button"
        data-test-id="mobile-toolbar-next"
        disabled={!hasNext}
        data-disabled={!hasNext || undefined}
        className={navigationClass(!hasNext)}
        style={{ opacity: hasNext ? 1 : 0 }}
        onClick={onNext}
      >
        <ChevronRight className={styles.navigationIcon({ class: ui?.navigationIcon })} />
      </button>
    </div>
  )
}
