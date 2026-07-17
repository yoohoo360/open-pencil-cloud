import { useRef } from 'react'
import type { MouseEvent } from 'react'
import { ContextMenuPortal, Root as ContextMenuRoot, ContextMenuTrigger } from '@radix-ui/react-context-menu'

import { LayerTreeRoot, LayerTreeItem, useInlineRename } from '@open-pencil/react'
import type { LayerNode } from '@open-pencil/react'
import { useEditorStore } from '@/app/editor/active-store'
import { CanvasMenu } from '../canvas/CanvasMenu'
import { LayerTreeNodeRow } from './LayerTreeNodeRow'
import { LayerTreeRenameRow } from './LayerTreeRenameRow'

const INDENT = 16

function flattenTree(
  nodes: LayerNode[],
  expanded: string[],
  level = 1
): { node: LayerNode; level: number; hasChildren: boolean }[] {
  const result: { node: LayerNode; level: number; hasChildren: boolean }[] = []
  for (const node of nodes) {
    const hasChildren = (node.children?.length ?? 0) > 0
    result.push({ node, level, hasChildren })
    if (hasChildren && expanded.includes(node.id) && node.children) {
      result.push(...flattenTree(node.children, expanded, level + 1))
    }
  }
  return result
}

interface LayerTreeProps {
  'data-test-id'?: string
}

export function LayerTree(props: LayerTreeProps) {
  const store = useEditorStore()
  const rename = useInlineRename((id, name) => store.renameNode(id, name))
  const renameControls = {
    commit: rename.commit,
    onKeydown: rename.onKeydown,
    focusInput: rename.focusInput
  }

  const scrollRef = useRef<HTMLDivElement>(null)

  function onLayerRightClick(e: MouseEvent<Element>) {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-node-id]')
    if (!row?.dataset.nodeId) return
    if (!store.state.selectedIds.has(row.dataset.nodeId)) store.select([row.dataset.nodeId])
  }

  return (
    <LayerTreeRoot
      onRename={(id, name) => store.renameNode(id, name)}
    >
      {({ items, expanded, draggingId, instruction, instructionTargetId }) => {
        const flatItems = flattenTree(items, expanded)
        const chrome = {
          draggingId,
          instruction,
          instructionTargetId,
          indent: INDENT
        }

        return (
          <ContextMenuRoot modal={false}>
            <div {...props} className="relative min-h-0 flex-1 overflow-hidden">
              <ContextMenuTrigger asChild onContextMenu={onLayerRightClick}>
                <div
                  ref={scrollRef}
                  data-test-id="layers-scroll"
                  className="scrollbar-thin h-full overflow-y-auto px-1"
                >
                  {flatItems.map(({ node, level, hasChildren }) => (
                    <LayerTreeItem
                      key={node.id}
                      node={node}
                      level={level}
                      hasChildren={hasChildren}
                    >
                      {({ node: n, isSelected, padLeft, actions: itemActions }) => (
                        rename.editingId.value === n.id ? (
                          <LayerTreeRenameRow
                            node={n}
                            hasChildren={hasChildren}
                            padLeft={padLeft}
                            expanded={expanded.includes(n.id)}
                            actions={itemActions}
                            renameControls={renameControls}
                          />
                        ) : (
                          <LayerTreeNodeRow
                            node={n}
                            level={level}
                            hasChildren={hasChildren}
                            selected={isSelected}
                            padLeft={padLeft}
                            expanded={expanded.includes(n.id)}
                            actions={itemActions}
                            chrome={chrome}
                            onRenameStart={rename.start}
                          />
                        )
                      )}
                    </LayerTreeItem>
                  ))}
                </div>
              </ContextMenuTrigger>
            </div>
            <ContextMenuPortal>
              <CanvasMenu />
            </ContextMenuPortal>
          </ContextMenuRoot>
        )
      }}
    </LayerTreeRoot>
  )
}
