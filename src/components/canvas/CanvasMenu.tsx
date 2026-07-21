import * as ContextMenu from '@radix-ui/react-context-menu'
import IconCombine from '~icons/lucide/combine'
import IconCopyMinus from '~icons/lucide/copy-minus'
import IconCopyX from '~icons/lucide/copy-x'
import IconListCollapse from '~icons/lucide/list-collapse'
import IconSpline from '~icons/lucide/spline'
import IconSquaresIntersect from '~icons/lucide/squares-intersect'
import IconTypeOutline from '~icons/lucide/type-outline'
import {
  editorCommandMetadata,
  formatShortcut,
  useEditorCommands,
  useI18n,
  useMenuModel,
  useSelectionState,
  type EditorCommandId
} from '@open-pencil/react'
import { memo, useMemo, type ComponentType } from 'react'

import { useEditorStore } from '@/app/editor/active-store'
import { createCanvasMenuActions } from '@/app/editor/canvas/menu/actions'
import { useCanvasContextMenu } from '@/app/editor/canvas/menu/context'
import { canvasMenuItemClass, canvasMenuShortcutClass } from '@/app/editor/canvas/menu/model'
import { appMenuShortcutLabel } from '@/app/shell/menu/shortcut'
import AppShortcutText from '@/components/ui/AppShortcutText'
import { menu, useMenuUI } from '@/components/ui/menu'

const booleanCommandIcons = {
  'selection.booleanUnion': IconCombine,
  'selection.booleanSubtract': IconCopyMinus,
  'selection.booleanIntersect': IconSquaresIntersect,
  'selection.booleanExclude': IconCopyX,
  'selection.flatten': IconListCollapse,
  'selection.outlineText': IconTypeOutline,
  'selection.outlineStroke': IconSpline
} satisfies Partial<Record<EditorCommandId, ComponentType<{ className?: string }>>>

function contextCommandTestId(id: EditorCommandId | undefined): string | undefined {
  return id ? editorCommandMetadata(id).contextTestId : undefined
}

function contextCommandIcon(id: EditorCommandId | undefined) {
  if (!id) return undefined
  return booleanCommandIcons[id as keyof typeof booleanCommandIcons]
}

export const CanvasMenu = memo(function CanvasMenu() {
  const store = useEditorStore()
  const { editor, selectedIds, hasSelection } = useSelectionState()
  const { getCommand } = useEditorCommands()
  const { canvasMenu } = useMenuModel()
  const { menu: t } = useI18n()

  const canvasMenuActions = useMemo(
    () => createCanvasMenuActions(store, { value: selectedIds }),
    [selectedIds, store]
  )
  const { execCommand } = canvasMenuActions
  const contextMenu = useCanvasContextMenu(
    { value: canvasMenu },
    { value: hasSelection },
    editor,
    canvasMenuActions,
    { value: t }
  )

  const menuCls = useMenuUI({
    content: 'min-w-56 shadow-[0_8px_30px_rgb(0_0_0/0.4)] animate-in fade-in zoom-in-95',
    separator: 'my-1'
  })
  const componentMenu = menu({ tone: 'component' })

  const cls = useMemo(
    () => ({
      menu: menuCls.content,
      submenu: menuCls.content.replace('min-w-56', 'min-w-0 w-max'),
      item: menuCls.item,
      component: componentMenu.item(),
      sep: menuCls.separator
    }),
    [componentMenu, menuCls.content, menuCls.item, menuCls.separator]
  )

  return (
    <ContextMenu.Content className={cls.menu} sideOffset={2} align="start">
      <ContextMenu.Item
        data-test-id="context-copy"
        className={cls.item}
        disabled={!hasSelection}
        onSelect={() => execCommand('copy')}
      >
        <span>{t.copy}</span>
        <AppShortcutText>{appMenuShortcutLabel('copy')}</AppShortcutText>
      </ContextMenu.Item>
      <ContextMenu.Item
        data-test-id="context-cut"
        className={cls.item}
        disabled={!hasSelection}
        onSelect={() => execCommand('cut')}
      >
        <span>{t.cut}</span>
        <AppShortcutText>{appMenuShortcutLabel('cut')}</AppShortcutText>
      </ContextMenu.Item>
      <ContextMenu.Item data-test-id="context-paste" className={cls.item} onSelect={() => execCommand('paste')}>
        <span>{t.pasteHere}</span>
        <AppShortcutText>{appMenuShortcutLabel('paste')}</AppShortcutText>
      </ContextMenu.Item>
      <ContextMenu.Item
        data-test-id="context-paste-to-replace"
        className={cls.item}
        disabled={!hasSelection}
        onSelect={canvasMenuActions.pasteToReplace}
      >
        <span>{t.pasteToReplace}</span>
      </ContextMenu.Item>
      <ContextMenu.Item
        data-test-id="context-duplicate"
        className={cls.item}
        disabled={!hasSelection}
        onSelect={() => getCommand('selection.duplicate').run()}
      >
        <span>{getCommand('selection.duplicate').label}</span>
        <AppShortcutText>
          {formatShortcut(editorCommandMetadata('selection.duplicate').shortcut)}
        </AppShortcutText>
      </ContextMenu.Item>
      <ContextMenu.Item
        data-test-id="context-delete"
        className={cls.item}
        disabled={!hasSelection}
        onSelect={() => getCommand('selection.delete').run()}
      >
        <span>{getCommand('selection.delete').label}</span>
        <AppShortcutText>{editorCommandMetadata('selection.delete').shortcut}</AppShortcutText>
      </ContextMenu.Item>

      {contextMenu.value.map((item, index) => {
        if (item.separator) {
          return <ContextMenu.Separator key={`menu-${index}`} className={cls.sep} />
        }

        if (item.sub) {
          return (
            <ContextMenu.Sub key={`menu-${index}`}>
              <ContextMenu.SubTrigger data-test-id={item.testId} className={cls.item}>
                <span>{item.label}</span>
                <span className="text-sm text-muted">›</span>
              </ContextMenu.SubTrigger>
              <ContextMenu.Portal>
                <ContextMenu.SubContent className={cls.submenu}>
                  {item.sub.map((sub, subIndex) => (
                    <ContextMenu.Item
                      key={subIndex}
                      className={cls.item}
                      data-test-id={sub.separator ? undefined : sub.testId}
                      disabled={sub.separator ? true : sub.disabled}
                      onSelect={() => {
                        if (!sub.separator) sub.action?.()
                      }}
                    >
                      {!sub.separator ? (
                        <>
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            {(() => {
                              const Icon = contextCommandIcon(sub.id)
                              return Icon ? <Icon className="size-3.5 shrink-0 text-muted" /> : null
                            })()}
                            <span className="truncate">{sub.label}</span>
                          </span>
                          {sub.shortcut ? <AppShortcutText>{sub.shortcut}</AppShortcutText> : null}
                        </>
                      ) : null}
                    </ContextMenu.Item>
                  ))}
                </ContextMenu.SubContent>
              </ContextMenu.Portal>
            </ContextMenu.Sub>
          )
        }

        const Icon = contextCommandIcon(item.id)
        return (
          <ContextMenu.Item
            key={`menu-${index}`}
            data-test-id={contextCommandTestId(item.id)}
            className={canvasMenuItemClass(item.label, cls)}
            disabled={item.disabled}
            onSelect={() => item.action?.()}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {Icon ? <Icon className="size-3.5 shrink-0 text-muted" /> : null}
              <span className="truncate">{item.label}</span>
            </span>
            {item.shortcut ? (
              <span className={`text-[11px] ${canvasMenuShortcutClass(item.label)}`}>{item.shortcut}</span>
            ) : null}
          </ContextMenu.Item>
        )
      })}
    </ContextMenu.Content>
  )
})

CanvasMenu.displayName = 'CanvasMenu'
export default CanvasMenu
