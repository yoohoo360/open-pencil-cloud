import IconChevronLeft from '~icons/lucide/chevron-left'
import IconChevronRight from '~icons/lucide/chevron-right'
import { AnimatePresence, motion } from 'motion/react'
import { memo, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import { toolbarToolTestId, ToolbarItem, type Tool } from '@open-pencil/react'
import type { EditorToolDef } from '@open-pencil/core/editor'
import ToolButton from '@/components/Toolbar/ToolButton'
import ToolFlyout from '@/components/Toolbar/ToolFlyout'
import ToolbarActionGroup from '@/components/Toolbar/ToolbarActionGroup'
import type { ToolbarActionItem, ToolbarUI, ToolIconMap, ToolLabels } from '@/components/Toolbar/types'
import toolbarTheme from '@/theme/toolbar'

export type MobileToolbarProps = {
  tools: EditorToolDef[]
  activeTool: Tool
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
}

const slideVariants = {
  initial: (dir: number) => ({ opacity: 0, x: dir * 20 }),
  animate: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -20 })
}

export const MobileToolbar = memo(function MobileToolbar({
  tools,
  activeTool,
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
}: MobileToolbarProps) {
  const toolbar = tv(toolbarTheme)
  const styles = useMemo(() => toolbar(), [toolbar])

  const activeKeyForTool = (tool: EditorToolDef) =>
    tool.flyout?.includes(activeTool) ? activeTool : tool.key

  const navigationClass = (disabled: boolean) =>
    toolbar({ disabled }).navigationAction({ class: ui?.navigationAction })

  return (
    <div
      data-test-id="mobile-toolbar"
      className="fixed left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5"
      style={{
        maxWidth: 'calc(100vw - 2rem)',
        bottom: 'calc(56px + env(safe-area-inset-bottom) + 0.75rem)'
      }}
    >
      <motion.button
        type="button"
        data-test-id="mobile-toolbar-prev"
        disabled={!hasPrev}
        data-disabled={!hasPrev || undefined}
        className={navigationClass(!hasPrev)}
        animate={{ opacity: hasPrev ? 1 : 0 }}
        transition={{ duration: 0.15 }}
        onClick={onPrev}
      >
        <IconChevronLeft className={styles.navigationIcon({ class: ui?.navigationIcon })} />
      </motion.button>

      <motion.div
        layout
        data-test-id="mobile-toolbar-container"
        className="relative flex h-11 items-center overflow-hidden rounded-[8px] border border-border bg-panel px-2 shadow-lg"
        transition={{ layout: { type: 'spring', damping: 30, stiffness: 500 } }}
      >
        <AnimatePresence mode="popLayout" custom={slideDirection}>
          {mobileCategory === 0 ? (
            <motion.div
              key="tools"
              data-test-id="mobile-toolbar-tools"
              className="flex gap-0.5"
              custom={slideDirection}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.15 }}
            >
              {tools.map((tool) =>
                tool.flyout && tool.flyout.length > 1 ? (
                  <ToolFlyout
                    key={tool.key}
                    mobile
                    tool={tool}
                    activeTool={activeTool}
                    toolIcons={toolIcons}
                    toolLabels={toolLabels}
                    toolShortcuts={toolShortcuts}
                    ui={ui}
                    onSelect={onSetTool}
                  />
                ) : (
                  <ToolbarItem key={tool.key} tool={tool.key}>
                    {({ active, actions }) => (
                      <ToolButton
                        mobile
                        data-test-id={toolbarToolTestId(tool.key, true)}
                        icon={toolIcons[tool.key]}
                        active={active || activeKeyForTool(tool) === activeTool}
                        ui={ui}
                        onClick={actions.select}
                      />
                    )}
                  </ToolbarItem>
                )
              )}
            </motion.div>
          ) : null}

          {mobileCategory === 1 ? (
            <motion.div
              key="edit"
              data-test-id="mobile-toolbar-edit"
              className="flex gap-0.5"
              custom={slideDirection}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.15 }}
            >
              <ToolbarActionGroup
                actions={editActions}
                ui={ui}
                testPrefix="mobile-toolbar"
                onAction={onAction}
              />
            </motion.div>
          ) : null}

          {mobileCategory === 2 ? (
            <motion.div
              key="arrange"
              data-test-id="mobile-toolbar-arrange"
              className="flex gap-0.5"
              custom={slideDirection}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.15 }}
            >
              <ToolbarActionGroup
                actions={arrangeActions}
                ui={ui}
                testPrefix="mobile-toolbar"
                onAction={onAction}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <motion.button
        type="button"
        data-test-id="mobile-toolbar-next"
        disabled={!hasNext}
        data-disabled={!hasNext || undefined}
        className={navigationClass(!hasNext)}
        animate={{ opacity: hasNext ? 1 : 0 }}
        transition={{ duration: 0.15 }}
        onClick={onNext}
      >
        <IconChevronRight className={styles.navigationIcon({ class: ui?.navigationIcon })} />
      </motion.button>
    </div>
  )
})

MobileToolbar.displayName = 'MobileToolbar'
export default MobileToolbar
