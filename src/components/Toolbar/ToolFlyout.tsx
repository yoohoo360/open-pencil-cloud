import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import IconChevronDown from '~icons/lucide/chevron-down'
import { memo, useMemo, type ReactNode } from 'react'
import { tv } from 'tailwind-variants'

import {
  toolbarFlyoutItemTestId,
  toolbarFlyoutTestId,
  toolbarToolTestId,
  ToolbarItem,
  type Tool
} from '@open-pencil/react'
import type { EditorToolDef } from '@open-pencil/core/editor'
import AppShortcutText from '@/components/ui/AppShortcutText'
import { menu } from '@/components/ui/menu'
import ToolButton from '@/components/Toolbar/ToolButton'
import type { ToolbarUI, ToolIconMap, ToolLabels } from '@/components/Toolbar/types'
import toolbarTheme from '@/theme/toolbar'

export type ToolFlyoutProps = {
  tool: EditorToolDef
  activeTool: Tool
  toolIcons: ToolIconMap
  toolLabels: ToolLabels
  toolShortcuts: Record<Tool, string>
  ui?: ToolbarUI
  mobile?: boolean
  children?: ReactNode
  onSelect: (tool: Tool) => void
}

export const ToolFlyout = memo(function ToolFlyout({
  tool,
  activeTool,
  toolIcons,
  toolLabels,
  toolShortcuts,
  ui,
  mobile = false,
  children,
  onSelect
}: ToolFlyoutProps) {
  const toolbar = tv(toolbarTheme)

  const activeKey = tool.flyout?.includes(activeTool) ? activeTool : tool.key
  const triggerActive =
    tool.key === activeTool || (tool.flyout?.includes(activeTool) ?? false) || activeKey === activeTool
  const styles = useMemo(() => toolbar({ active: triggerActive, mobile }), [mobile, toolbar, triggerActive])

  const flyoutItemClass = (subActive: boolean) =>
    menu().item({ class: toolbar({ subActive }).flyoutItem({ class: ui?.flyoutItem }) })

  const defaultTrigger = (
    <ToolButton
      data-test-id={toolbarToolTestId(activeKey, mobile)}
      icon={toolIcons[activeKey]}
      label={toolLabels[activeKey]}
      active={triggerActive}
      mobile={mobile}
      ui={ui}
      onClick={() => onSelect(activeKey)}
    />
  )

  return (
    <div className={styles.flyoutGroup({ class: ui?.flyoutGroup })}>
      {children ?? defaultTrigger}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            data-test-id={toolbarFlyoutTestId(tool.key, mobile)}
            data-active={triggerActive || undefined}
            data-mobile={mobile || undefined}
            aria-label={`${toolLabels[tool.key]} options`}
            className={styles.flyoutTrigger({ class: ui?.flyoutTrigger })}
          >
            <IconChevronDown className={styles.flyoutTriggerIcon({ class: ui?.flyoutTriggerIcon })} />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="top"
            sideOffset={8}
            align="start"
            className={styles.flyoutContent({ class: ui?.flyoutContent })}
          >
            {tool.flyout?.map((sub) => (
              <ToolbarItem key={sub} tool={sub}>
                {({ active: subActive, actions }) => (
                  <DropdownMenu.Item
                    data-test-id={toolbarFlyoutItemTestId(sub, mobile)}
                    data-active={subActive || undefined}
                    className={flyoutItemClass(subActive)}
                    onSelect={actions.select}
                  >
                    {(() => {
                      const SubIcon = toolIcons[sub]
                      return <SubIcon className={styles.flyoutItemIcon({ class: ui?.flyoutItemIcon })} />
                    })()}
                    <span className={styles.flyoutItemLabel({ class: ui?.flyoutItemLabel })}>
                      {toolLabels[sub]}
                    </span>
                    {!mobile && toolShortcuts[sub] ? (
                      <AppShortcutText>{toolShortcuts[sub]}</AppShortcutText>
                    ) : null}
                  </DropdownMenu.Item>
                )}
              </ToolbarItem>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
})

ToolFlyout.displayName = 'ToolFlyout'
export default ToolFlyout
