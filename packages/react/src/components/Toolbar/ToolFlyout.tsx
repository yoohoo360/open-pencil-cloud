import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { tv } from 'tailwind-variants'
import type { EditorToolDef, Tool } from '@open-pencil/core/editor'
import { IS_BROWSER } from '@open-pencil/core/constants'

import { AppShortcutText } from '#react/components/ui/AppShortcutText'
import { menu } from '#react/components/ui/menu'
import { ToolButton } from '#react/components/Toolbar/ToolButton'
import type { ToolbarUI, ToolIconMap, ToolLabels } from '#react/components/Toolbar/types'
import { useI18n } from '#react/i18n'
import { isToolbarToolActive } from '#react/primitives/Toolbar/useToolbarState'
import { toolbarFlyoutItemTestId, toolbarFlyoutTestId, toolbarToolTestId } from '#react/testing/test-id'
import toolbarTheme from '#react/theme/toolbar'

const FLYOUT_SIDE_OFFSET = 8

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
  const [highlighted, setHighlighted] = useState<Tool | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuStyle, setMenuStyle] = useState<{ left: number; bottom: number }>({
    left: 0,
    bottom: 0
  })

  useLayoutEffect(() => {
    if (!open || !IS_BROWSER) return
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    setMenuStyle({
      left: rect.left,
      bottom: window.innerHeight - rect.top + FLYOUT_SIDE_OFFSET
    })
  }, [open])

  useEffect(() => {
    if (!open) return

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [open])

  const menuNode =
    open && IS_BROWSER ? (
      <div
        ref={menuRef}
        role="menu"
        className={`fixed z-[100] min-w-32 ${styles.flyoutContent({ class: ui?.flyoutContent })}`}
        style={{ left: menuStyle.left, bottom: menuStyle.bottom }}
      >
        {(tool.flyout ?? []).map((sub) => {
          const Icon = toolIcons[sub]
          const checked = sub === selectedTool
          return (
            <button
              key={sub}
              type="button"
              role="menuitemradio"
              aria-checked={checked}
              data-test-id={toolbarFlyoutItemTestId(sub, mobile)}
              data-active={checked || undefined}
              data-highlighted={highlighted === sub ? '' : undefined}
              className={menu({ justify: 'start' }).item({
                class: toolbar().flyoutItem({ class: ui?.flyoutItem })
              })}
              onMouseEnter={() => setHighlighted(sub)}
              onMouseLeave={() => setHighlighted((current) => (current === sub ? null : current))}
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
                {checked ? <Check className="size-3.5" /> : null}
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
    ) : null

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
      <button
        ref={triggerRef}
        type="button"
        data-test-id={toolbarFlyoutTestId(tool.key, mobile)}
        data-mobile={mobile || undefined}
        data-state={open ? 'open' : 'closed'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={dialogs.toolOptions({ tool: toolLabels[tool.key] })}
        className={styles.flyoutTrigger({ class: ui?.flyoutTrigger })}
        onClick={() => {
          setHighlighted(selectedTool)
          setOpen((value) => !value)
        }}
      >
        <ChevronDown className={styles.flyoutTriggerIcon({ class: ui?.flyoutTriggerIcon })} />
      </button>
      {menuNode && IS_BROWSER ? createPortal(menuNode, document.body) : menuNode}
    </div>
  )
}
