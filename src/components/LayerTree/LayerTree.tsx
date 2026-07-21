import * as ContextMenu from '@radix-ui/react-context-menu'
import { memo, useCallback, useMemo, type FocusEvent, type HTMLAttributes, type MouseEvent } from 'react'
import { tv } from 'tailwind-variants'

import {
  LayerTreeItem,
  LayerTreeRoot,
  useInlineRename,
  type LayerDragInstruction
} from '@open-pencil/react'
import { useEditorStore } from '@/app/editor/active-store'
import CanvasMenu from '@/components/canvas/CanvasMenu'
import LayerTreeNodeRow from '@/components/LayerTree/LayerTreeNodeRow'
import LayerTreeRenameRow from '@/components/LayerTree/LayerTreeRenameRow'
import { LayerTreeUIProvider, type LayerTreeUI } from '@/components/LayerTree/ui'
import layerTreeTheme from '@/theme/layer-tree'

const INDENT = 16

export type LayerTreeProps = HTMLAttributes<HTMLDivElement> & {
  ui?: LayerTreeUI
}

export const LayerTree = memo(function LayerTree({ ui, className, ...props }: LayerTreeProps) {
  const styles = useMemo(() => tv(layerTreeTheme)(), [])
  const store = useEditorStore()
  const rename = useInlineRename((id, name) => store.renameNode(id, name))
  const renameControls = useMemo(
    () => ({
      commit: rename.commit,
      onKeydown: rename.onKeydown,
      focusInput: rename.focusInput
    }),
    [rename.commit, rename.focusInput, rename.onKeydown]
  )

  const onLayerRightClick = useCallback(
    (event: MouseEvent) => {
      const row = (event.target as HTMLElement).closest<HTMLElement>('[data-node-id]')
      if (!row?.dataset.nodeId) return
      if (!store.state.selectedIds.has(row.dataset.nodeId)) store.select([row.dataset.nodeId])
    },
    [store]
  )

  const onFocusOut = useCallback((event: FocusEvent<HTMLDivElement>, setFocused: (focused: boolean) => void) => {
    const next = event.relatedTarget
    if (
      next instanceof Node &&
      event.currentTarget instanceof Node &&
      event.currentTarget.contains(next)
    ) {
      return
    }
    setFocused(false)
  }, [])

  const chrome = useCallback(
    (scope: {
      draggingId: string | null
      instruction: LayerDragInstruction | null
      instructionTargetId: string | null
      focused: boolean
    }) => ({
      draggingId: scope.draggingId,
      instruction: scope.instruction,
      instructionTargetId: scope.instructionTargetId,
      focused: scope.focused,
      indent: INDENT
    }),
    []
  )

  return (
    <LayerTreeUIProvider ui={ui}>
      <LayerTreeRoot indentPerLevel={INDENT}>
        {(scope) => (
          <ContextMenu.Root modal={false}>
            <div
              {...props}
              className={className ?? 'relative min-h-0 flex-1 overflow-hidden'}
              onFocusCapture={() => scope.actions.setFocused(true)}
              onBlurCapture={(event) => onFocusOut(event, scope.actions.setFocused)}
            >
              <ContextMenu.Trigger asChild onContextMenu={onLayerRightClick}>
                <div
                  data-test-id="layers-scroll"
                  data-slot="viewport"
                  className={styles.viewport({ class: ui?.viewport })}
                >
                  {scope.visibleRows.map((row) => {
                    const expanded = scope.expanded.has(row.node.id)
                    const isSelected = scope.selectedIds.has(row.node.id)
                    return (
                      <LayerTreeItem
                        key={row.node.id}
                        node={row.node}
                        level={row.level}
                        hasChildren={row.hasChildren}
                      >
                        {(item) =>
                          rename.editingId === row.node.id ? (
                            <LayerTreeRenameRow
                              node={row.node}
                              hasChildren={row.hasChildren}
                              padLeft={item.padLeft}
                              expanded={expanded}
                              actions={item.actions}
                              renameControls={renameControls}
                            />
                          ) : (
                            <LayerTreeNodeRow
                              node={row.node}
                              level={row.level}
                              hasChildren={row.hasChildren}
                              selected={isSelected}
                              padLeft={item.padLeft}
                              expanded={expanded}
                              actions={item.actions}
                              chrome={chrome(scope)}
                              onRenameStart={rename.start}
                            />
                          )
                        }
                      </LayerTreeItem>
                    )
                  })}
                </div>
              </ContextMenu.Trigger>
            </div>
            <ContextMenu.Portal>
              <CanvasMenu />
            </ContextMenu.Portal>
          </ContextMenu.Root>
        )}
      </LayerTreeRoot>
    </LayerTreeUIProvider>
  )
})

LayerTree.displayName = 'LayerTree'
export default LayerTree
