import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, Root as DropdownMenuRoot, DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu'

import IconChevronDown from '~icons/lucide/chevron-down'

import { AppShortcutText } from '@/components/ui/AppShortcutText'
import { menu } from '@/components/ui/menu'
import { ToolbarItem, toolbarFlyoutItemTestId, toolbarFlyoutTestId, toolbarToolTestId } from '@open-pencil/react'
import { ToolButton } from '@/components/Toolbar/ToolButton'

import type { Tool } from '@open-pencil/react'
import type { EditorToolDef } from '@open-pencil/core/editor'
import type { ToolbarUI, ToolIconMap, ToolLabels } from '@/components/Toolbar/types'

export interface ToolFlyoutProps {
  tool: EditorToolDef
  activeTool: Tool
  toolIcons: ToolIconMap
  toolLabels: ToolLabels
  toolShortcuts: Record<Tool, string>
  ui?: ToolbarUI
  mobile?: boolean
  onSelect?: (tool: Tool) => void
}

export function ToolFlyout({
  tool,
  activeTool,
  toolIcons,
  toolLabels,
  toolShortcuts,
  ui,
  mobile = false,
  onSelect
}: ToolFlyoutProps) {
  const flyout = tool.flyout ?? []
  const activeKey = flyout.includes(activeTool) ? activeTool : tool.key
  const isActiveTool = (key: Tool) =>
    tool.key === activeTool || flyout.includes(activeTool) || key === activeTool

  return (
    <div className="flex items-center">
      <ToolButton
        data-test-id={toolbarToolTestId(activeKey, mobile)}
        icon={toolIcons[activeKey]}
        active={isActiveTool(activeKey)}
        mobile={mobile}
        onClick={() => onSelect?.(activeKey)}
      />

      <DropdownMenuRoot>
        <DropdownMenuTrigger asChild>
          <button
            data-test-id={toolbarFlyoutTestId(tool.key, mobile)}
            type="button"
            className={[
              'flex h-8 w-3 cursor-pointer items-center justify-center border-none transition-colors',
              mobile ? 'rounded-[6px] select-none' : 'rounded-lg',
              isActiveTool(activeKey)
                ? 'bg-accent text-white'
                : (mobile
                  ? 'bg-transparent text-muted active:bg-hover'
                  : 'bg-transparent text-muted hover:bg-hover hover:text-surface')
            ].join(' ')}
          >
            <IconChevronDown className="size-2.5" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuPortal>
          <DropdownMenuContent side="top" sideOffset={8} align="start" className={ui?.flyoutContent}>
            {flyout.map((sub) => (
              <ToolbarItem key={sub} tool={sub}>
                {({ active: subActive, actions }) => (
                  <DropdownMenuItem
                    data-test-id={toolbarFlyoutItemTestId(sub, mobile)}
                    className={menu().item({ class: subActive ? 'bg-accent text-white' : undefined })}
                    onSelect={() => actions.select()}
                  >
                    {(() => {
                      const Icon = toolIcons[sub]
                      return <Icon className="size-3.5" />
                    })()}
                    <span className="flex-1">{toolLabels[sub]}</span>
                    {!mobile && toolShortcuts[sub] && (
                      <AppShortcutText>{toolShortcuts[sub]}</AppShortcutText>
                    )}
                  </DropdownMenuItem>
                )}
              </ToolbarItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </div>
  )
}
