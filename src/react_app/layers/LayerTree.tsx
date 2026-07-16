import { ChevronRight, Eye, EyeOff, Lock, Unlock } from 'lucide-react'
import { useMemo, useRef } from 'react'

import { COMPONENT_TYPES, nodeIcon } from '@/react_app/layers/layerIcons'
import { EditorBridge } from '@/react_app/shell/EditorBridge'
import { Tip, TipProvider } from '@/react_app/ui/Tip'
import {
  LayerTreeItem,
  LayerTreeRoot,
  useEditor,
  useI18n,
  useInlineRename,
  useLayerDrag,
  useLayerDragItem,
  type LayerNode
} from '@open-pencil/react'

import type { Editor } from '@open-pencil/core/editor'
import type { RefObject } from 'react'

const INDENT = 16

interface FlatItem {
  node: LayerNode
  level: number
  hasChildren: boolean
}

function flattenTree(items: LayerNode[], expanded: string[], level = 1): FlatItem[] {
  const result: FlatItem[] = []
  for (const item of items) {
    const hasChildren = (item.children?.length ?? 0) > 0
    result.push({ node: item, level, hasChildren })
    if (hasChildren && expanded.includes(item.id) && item.children) {
      result.push(...flattenTree(item.children, expanded, level + 1))
    }
  }
  return result
}

function ExpandChevron({
  hasChildren,
  isExpanded,
  onToggle
}: {
  hasChildren: boolean
  isExpanded: boolean
  onToggle: () => void
}) {
  if (!hasChildren) return <span className="w-4 shrink-0" />
  return (
    <span
      className={`flex w-4 shrink-0 cursor-pointer items-center justify-center text-muted transition-transform hover:text-surface ${
        isExpanded ? 'rotate-90' : 'rotate-0'
      }`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
    >
      <ChevronRight className="size-3" />
    </span>
  )
}

function LayerRenameRow({
  node,
  padLeft,
  hasChildren,
  isExpanded,
  toggleExpand,
  rename
}: {
  node: LayerNode
  padLeft: string
  hasChildren: boolean
  isExpanded: boolean
  toggleExpand: () => void
  rename: ReturnType<typeof useInlineRename>
}) {
  const Icon = nodeIcon(node)
  return (
    <div className="flex w-full items-center gap-1 py-1" style={{ paddingLeft: padLeft }}>
      <ExpandChevron hasChildren={hasChildren} isExpanded={isExpanded} onToggle={toggleExpand} />
      <Icon className="size-3 shrink-0 opacity-70" />
      <input
        ref={(el) => rename.focusInput(el)}
        data-layer-edit
        data-test-id="layers-item-input"
        className="min-w-0 flex-1 rounded border border-accent bg-input px-1 py-0 text-xs text-surface outline-none"
        defaultValue={node.name}
        onBlur={(e) => rename.commit(node.id, e.currentTarget)}
        onKeyDown={(e) => rename.onKeydown(e.nativeEvent)}
      />
    </div>
  )
}

function LayerActionButtons({
  node,
  isSelected,
  toggleLock,
  toggleVisibility
}: {
  node: LayerNode
  isSelected: boolean
  toggleLock: () => void
  toggleVisibility: () => void
}) {
  const { menu: t } = useI18n()
  return (
    <span
      className={`flex shrink-0 items-center gap-0.5 ${
        !node.locked && node.visible ? 'opacity-0 group-hover/row:opacity-100' : ''
      }`}
    >
      <Tip label={node.locked ? t.unlock : t.lock}>
        <span
          className="flex size-4 items-center justify-center rounded hover:bg-white/15"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            toggleLock()
          }}
        >
          {node.locked ? (
            <Lock className={`size-3 ${isSelected ? 'text-white' : 'text-surface'}`} />
          ) : (
            <Unlock
              className={`size-3 opacity-0 group-hover/row:opacity-100 ${
                isSelected ? 'text-white/80' : 'text-surface/70'
              }`}
            />
          )}
        </span>
      </Tip>
      <Tip label={node.visible ? t.hide : t.show}>
        <span
          className="flex size-4 items-center justify-center rounded hover:bg-white/15"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            toggleVisibility()
          }}
        >
          {!node.visible ? (
            <EyeOff className={`size-3 ${isSelected ? 'text-white' : 'text-surface'}`} />
          ) : (
            <Eye
              className={`size-3 opacity-0 group-hover/row:opacity-100 ${
                isSelected ? 'text-white/80' : 'text-surface/70'
              }`}
            />
          )}
        </span>
      </Tip>
    </span>
  )
}

function rowClassName({
  isSelected,
  isDragging,
  isMakeChild,
  visible
}: {
  isSelected: boolean
  isDragging: boolean
  isMakeChild: boolean
  visible: boolean
}): string {
  return [
    'group/row relative flex w-full cursor-pointer items-center gap-1 rounded border-none py-1 pr-1 text-left text-xs',
    isSelected ? 'bg-accent text-white' : 'bg-transparent text-surface hover:bg-hover',
    isDragging ? 'opacity-30' : '',
    isMakeChild ? 'ring-2 ring-accent ring-inset' : '',
    !visible ? 'opacity-50' : ''
  ]
    .filter(Boolean)
    .join(' ')
}

function LayerRow({
  item,
  isExpanded,
  draggingId,
  instruction,
  instructionTargetId,
  rename,
  drag
}: {
  item: FlatItem
  isExpanded: boolean
  draggingId: string | null
  instruction: { type: string } | null
  instructionTargetId: string | null
  rename: ReturnType<typeof useInlineRename>
  drag: ReturnType<typeof useLayerDrag>
}) {
  const rowRef = useRef<HTMLButtonElement | null>(null)

  useLayerDragItem(
    rowRef as RefObject<HTMLElement | null>,
    () => ({
      id: item.node.id,
      level: item.level,
      hasChildren: item.hasChildren,
      parentId: null
    }),
    {
      indentPerLevel: INDENT,
      setDraggingId: drag.setDraggingId,
      setInstruction: drag.setInstruction,
      setInstructionTargetId: drag.setInstructionTargetId
    }
  )

  return (
    <LayerTreeItem node={item.node} level={item.level} hasChildren={item.hasChildren}>
      {({
        node,
        isSelected,
        padLeft,
        select: selectNode,
        toggleExpand,
        toggleVisibility,
        toggleLock
      }) => {
        if (rename.editingId === node.id) {
          return (
            <LayerRenameRow
              node={node}
              padLeft={padLeft}
              hasChildren={item.hasChildren}
              isExpanded={isExpanded}
              toggleExpand={toggleExpand}
              rename={rename}
            />
          )
        }

        const Icon = nodeIcon(node)
        const isMakeChild = instructionTargetId === node.id && instruction?.type === 'make-child'
        const showDropLine =
          instructionTargetId === node.id &&
          instruction !== null &&
          instruction.type !== 'make-child'

        return (
          <button
            ref={rowRef}
            type="button"
            data-test-id="layers-item"
            data-node-id={node.id}
            className={rowClassName({
              isSelected,
              isDragging: draggingId === node.id,
              isMakeChild: Boolean(isMakeChild),
              visible: node.visible
            })}
            style={{ paddingLeft: padLeft }}
            onClick={(e) => selectNode(e.shiftKey)}
            onDoubleClick={() => rename.start(node.id, node.name)}
          >
            <ExpandChevron
              hasChildren={item.hasChildren}
              isExpanded={isExpanded}
              onToggle={toggleExpand}
            />
            <Icon
              className={`size-3 shrink-0 ${
                COMPONENT_TYPES.has(node.type) ? 'text-component opacity-100' : 'opacity-70'
              }`}
            />
            <span className="min-w-0 flex-1 truncate">{node.name}</span>
            <LayerActionButtons
              node={node}
              isSelected={isSelected}
              toggleLock={toggleLock}
              toggleVisibility={toggleVisibility}
            />
            {showDropLine ? (
              <div
                className={`pointer-events-none absolute h-0.5 bg-accent ${
                  instruction.type === 'reorder-below' ? 'bottom-0' : ''
                } ${instruction.type === 'reorder-above' ? 'top-0' : ''}`}
                style={{
                  left: `${(item.level - 1) * INDENT}px`,
                  width: `calc(100% - ${(item.level - 1) * INDENT}px)`
                }}
              />
            ) : null}
          </button>
        )
      }}
    </LayerTreeItem>
  )
}

function LayerTreeList({
  items,
  expanded,
  treeKey,
  rename,
  drag,
  onLayerRightClick
}: {
  items: LayerNode[]
  expanded: string[]
  treeKey: number
  rename: ReturnType<typeof useInlineRename>
  drag: ReturnType<typeof useLayerDrag>
  onLayerRightClick: (e: React.MouseEvent) => void
}) {
  const flat = useMemo(() => flattenTree(items, expanded), [items, expanded])
  const expandedSet = useMemo(() => new Set(expanded), [expanded])

  return (
    <div
      key={treeKey}
      data-test-id="layers-tree"
      className="relative scrollbar-thin flex-1 overflow-y-auto px-1"
      onContextMenu={onLayerRightClick}
    >
      {flat.map((item) => (
        <LayerRow
          key={item.node.id}
          item={item}
          isExpanded={expandedSet.has(item.node.id)}
          draggingId={drag.draggingId}
          instruction={drag.instruction}
          instructionTargetId={drag.instructionTargetId}
          rename={rename}
          drag={drag}
        />
      ))}
    </div>
  )
}

function LayerTreeInner() {
  const editor = useEditor()
  const rename = useInlineRename((id, name) => editor.renameNode(id, name))
  const drag = useLayerDrag(editor, INDENT)

  function onLayerRightClick(e: React.MouseEvent) {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-node-id]')
    const nodeId = row?.dataset.nodeId
    if (!nodeId) return
    if (!editor.state.selectedIds.has(nodeId)) editor.select([nodeId])
  }

  return (
    <TipProvider>
      <LayerTreeRoot indentPerLevel={INDENT}>
        {({ items, expanded, treeKey }) => (
          <LayerTreeList
            items={items}
            expanded={expanded}
            treeKey={treeKey}
            rename={rename}
            drag={drag}
            onLayerRightClick={onLayerRightClick}
          />
        )}
      </LayerTreeRoot>
    </TipProvider>
  )
}

export function LayerTree({ editor }: { editor: Editor }) {
  return (
    <EditorBridge editor={editor}>
      <LayerTreeInner />
    </EditorBridge>
  )
}
