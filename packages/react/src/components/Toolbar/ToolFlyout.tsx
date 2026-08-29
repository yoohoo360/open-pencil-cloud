import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { tv } from 'tailwind-variants'
import type { EditorToolDef, Tool } from '@open-pencil/core/editor'

import { AppShortcutText } from '#react/components/ui/AppShortcutText'
import { menu } from '#react/components/ui/menu'
import { ToolButton } from '#react/components/Toolbar/ToolButton'
import type { ToolbarUI, ToolIconMap, ToolLabels } from '#react/components/Toolbar/types'
import { useI18n } from '#react/i18n'
import { isToolbarToolActive } from '#react/primitives/Toolbar/useToolbarState'
import { toolbarFlyoutItemTestId, toolbarFlyoutTestId, toolbarToolTestId } from '#react/testing/test-id'
import toolbarTheme from '#react/theme/toolbar'

export function ToolFlyout({
  tool,
  activeTool,
  selectedTool,
  toolIcons,
  toolLabels,
  toolShortcuts,
  ui,
  mobile = false,
  onSelect
}: {
  tool: EditorToolDef
  activeTool: Tool
  selectedTool: Tool
  toolIcons: ToolIconMap
  toolLabels: ToolLabels
  toolShortcuts: Record<Tool, string>
  ui?: ToolbarUI
  mobile?: boolean
  onSelect: (tool: Tool) => void
}) {
  const toolbar = tv(toolbarTheme)
  const { dialogs } = useI18n()
  const triggerActive = isToolbarToolActive(tool, activeTool)
  const styles = toolbar({ active: triggerActive, mobile })
  const SelectedIcon = toolIcons[selectedTool]
  const [open, setOpen] = useState(false)

  return (
    <div className={styles.flyoutGroup({ class: ui?.flyoutGroup })}>
      <ToolButton
        data-test-id={toolbarToolTestId(selectedTool, mobile)}
        icon={SelectedIcon}
        label={toolLabels[selectedTool]}
        active={triggerActive}
        mobile={mobile}
        ui={ui}
        onClick={() => onSelect(selectedTool)}
      />
      <div className="relative">
        <button
          type="button"
          data-test-id={toolbarFlyoutTestId(tool.key, mobile)}
          data-mobile={mobile || undefined}
          data-state={open ? 'open' : undefined}
          aria-label={dialogs.toolOptions({ tool: toolLabels[tool.key] })}
          className={styles.flyoutTrigger({ class: ui?.flyoutTrigger })}
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDown className={styles.flyoutTriggerIcon({ class: ui?.flyoutTriggerIcon })} />
        </button>
        {open ? (
          <div
            className={`absolute bottom-full left-0 z-20 mb-1 flex min-w-32 flex-col ${styles.flyoutContent({ class: ui?.flyoutContent })}`}
          >
            {(tool.flyout ?? []).map((sub) => {
              const Icon = toolIcons[sub]
              return (
                <button
                  key={sub}
                  type="button"
                  data-test-id={toolbarFlyoutItemTestId(sub, mobile)}
                  data-active={sub === selectedTool || undefined}
                  className={menu({ justify: 'start' }).item({
                    class: toolbar().flyoutItem({ class: ui?.flyoutItem })
                  })}
                  onClick={() => {
                    onSelect(sub)
                    setOpen(false)
                  }}
                >
                  <span
                    data-slot="flyout-item-indicator"
                    className={styles.flyoutItemIndicator({ class: ui?.flyoutItemIndicator })}
                    aria-hidden="true"
                  >
                    {sub === selectedTool ? <Check className="size-3.5" /> : null}
                  </span>
                  <Icon className={styles.flyoutItemIcon({ class: ui?.flyoutItemIcon })} />
                  <span className={styles.flyoutItemLabel({ class: ui?.flyoutItemLabel })}>
                    {toolLabels[sub]}
                  </span>
                  {!mobile && toolShortcuts[sub] ? (
                    <AppShortcutText>{toolShortcuts[sub]}</AppShortcutText>
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
