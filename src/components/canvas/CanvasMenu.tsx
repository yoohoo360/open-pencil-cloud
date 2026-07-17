import type { ComponentType } from 'react'
import { ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent, ContextMenuPortal } from '@radix-ui/react-context-menu'

import IconCombine from '~icons/lucide/combine'
import IconCopyMinus from '~icons/lucide/copy-minus'
import IconCopyX from '~icons/lucide/copy-x'
import IconListCollapse from '~icons/lucide/list-collapse'
import IconSpline from '~icons/lucide/spline'
import IconTypeOutline from '~icons/lucide/type-outline'
import IconSquaresIntersect from '~icons/lucide/squares-intersect'

import { useEditorCommands, useI18n, useMenuModel, useSelectionState, editorCommandMetadata, formatShortcut, testId } from '@open-pencil/react'
import type { EditorCommandId } from '@open-pencil/react'

import { useEditorStore } from '@/app/editor/active-store'
import { appMenuShortcutLabel } from '@/app/shell/menu/shortcut'
import { createCanvasMenuActions } from '@/app/editor/canvas/menu/actions'
import { useCanvasContextMenu } from '@/app/editor/canvas/menu/context'
import { canvasMenuItemClass, canvasMenuShortcutClass } from '@/app/editor/canvas/menu/model'
import { AppShortcutText } from '@/components/ui/AppShortcutText'
import { useMenuUI, menu } from '@/components/ui/menu'

export function CanvasMenu() {
  const store = useEditorStore()
  const { editor, selectedIds, hasSelection } = useSelectionState()
  const { getCommand } = useEditorCommands()
  const { canvasMenu } = useMenuModel()
  const { menu: t } = useI18n()

  const canvasMenuActions = createCanvasMenuActions(store, selectedIds)
  const { execCommand } = canvasMenuActions
  const contextMenu = useCanvasContextMenu(canvasMenu, hasSelection, editor, canvasMenuActions, t)

  const menuCls = useMenuUI({
    content: 'min-w-56 shadow-[0_8px_30px_rgb(0_0_0/0.4)] animate-in fade-in zoom-in-95',
    separator: 'my-1'
  })
  const componentMenu = menu({ tone: 'component' })

  const cls = {
    menu: menuCls.content,
    submenu: menuCls.content.replace('min-w-56', 'min-w-0 w-max'),
    item: menuCls.item,
    component: componentMenu.item(),
    sep: menuCls.separator
  }

  const booleanCommandIcons: Partial<Record<EditorCommandId, ComponentType<{ className?: string }>>> = {
    'selection.booleanUnion': IconCombine,
    'selection.booleanSubtract': IconCopyMinus,
    'selection.booleanIntersect': IconSquaresIntersect,
    'selection.booleanExclude': IconCopyX,
    'selection.flatten': IconListCollapse,
    'selection.outlineText': IconTypeOutline,
    'selection.outlineStroke': IconSpline
  }

  function contextCommandTestId(id: EditorCommandId | undefined): string | undefined {
    return id ? editorCommandMetadata(id).contextTestId : undefined
  }

  function contextCommandIcon(id: EditorCommandId | undefined): ComponentType<{ className?: string }> | undefined {
    if (!id) return undefined
    return booleanCommandIcons[id]
  }

  return (
    <ContextMenuContent className={cls.menu} sideOffset={2} align="start">
      <ContextMenuItem
        data-test-id="context-copy"
        className={cls.item}
        disabled={!hasSelection}
        onSelect={() => execCommand('copy')}
      >
        <span>{t.copy}</span>
        <AppShortcutText>{appMenuShortcutLabel('copy')}</AppShortcutText>
      </ContextMenuItem>
      <ContextMenuItem
        data-test-id="context-cut"
        className={cls.item}
        disabled={!hasSelection}
        onSelect={() => execCommand('cut')}
      >
        <span>{t.cut}</span>
        <AppShortcutText>{appMenuShortcutLabel('cut')}</AppShortcutText>
      </ContextMenuItem>
      <ContextMenuItem
        data-test-id="context-paste"
        className={cls.item}
        onSelect={() => execCommand('paste')}
      >
        <span>{t.pasteHere}</span>
        <AppShortcutText>{appMenuShortcutLabel('paste')}</AppShortcutText>
      </ContextMenuItem>
      <ContextMenuItem
        data-test-id="context-paste-to-replace"
        className={cls.item}
        disabled={!hasSelection}
        onSelect={() => canvasMenuActions.pasteToReplace()}
      >
        <span>{t.pasteToReplace}</span>
      </ContextMenuItem>
      <ContextMenuItem
        data-test-id="context-duplicate"
        className={cls.item}
        disabled={!hasSelection}
        onSelect={() => getCommand('selection.duplicate').run()}
      >
        <span>{getCommand('selection.duplicate').label}</span>
        <AppShortcutText>
          {formatShortcut(editorCommandMetadata('selection.duplicate').shortcut)}
        </AppShortcutText>
      </ContextMenuItem>
      <ContextMenuItem
        data-test-id="context-delete"
        className={cls.item}
        disabled={!hasSelection}
        onSelect={() => getCommand('selection.delete').run()}
      >
        <span>{getCommand('selection.delete').label}</span>
        <AppShortcutText>{editorCommandMetadata('selection.delete').shortcut}</AppShortcutText>
      </ContextMenuItem>

      {contextMenu.map((item, i) => {
        if (item.separator) {
          return <ContextMenuSeparator key={`sep-${i}`} className={cls.sep} />
        }
        if (item.sub) {
          return (
            <ContextMenuSub key={`sub-${i}`}>
              <ContextMenuSubTrigger {...testId(item.testId)} className={cls.item}>
                <span>{item.label}</span>
                <span className="text-sm text-muted">›</span>
              </ContextMenuSubTrigger>
              <ContextMenuPortal>
                <ContextMenuSubContent className={cls.submenu}>
                  {item.sub.map((sub, j) => (
                    <ContextMenuItem
                      key={j}
                      className={cls.item}
                      {...testId(sub.separator ? undefined : sub.testId)}
                      disabled={sub.separator ? true : sub.disabled}
                      onSelect={() => { if (!sub.separator) sub.action?.() }}
                    >
                      {!sub.separator && (
                        <>
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            {contextCommandIcon(sub.id) && (
                              (() => {
                                const Icon = contextCommandIcon(sub.id)
                                return Icon ? <Icon className="size-3.5 shrink-0 text-muted" /> : null
                              })()
                            )}
                            <span className="truncate">{sub.label}</span>
                          </span>
                          {sub.shortcut && <AppShortcutText>{sub.shortcut}</AppShortcutText>}
                        </>
                      )}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuPortal>
            </ContextMenuSub>
          )
        }
        const Icon = contextCommandIcon(item.id)
        return (
          <ContextMenuItem
            key={`item-${i}`}
            {...testId(contextCommandTestId(item.id))}
            className={canvasMenuItemClass(item.label ?? '', cls)}
            disabled={item.disabled}
            onSelect={() => item.action?.()}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {Icon && <Icon className="size-3.5 shrink-0 text-muted" />}
              <span className="truncate">{item.label}</span>
            </span>
            {item.shortcut && (
              <span
                className={`text-[11px] ${canvasMenuShortcutClass(item.label ?? '')}`}
              >
                {item.shortcut}
              </span>
            )}
          </ContextMenuItem>
        )
      })}
    </ContextMenuContent>
  )
}
